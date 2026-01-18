import { v4 as uuid } from 'uuid';
import type { Task, TaskStatus, TaskResult, CreateTaskRequest, TaskTarget } from '@merge/shared-types';
import { wsService } from './ws.service.js';
import { agentService } from './agent.service.js';

class TaskService {
  private tasks: Map<string, Task> = new Map();

  createTask(fromAgentId: string, roomId: string, request: CreateTaskRequest): Task {
    const now = new Date().toISOString();
    const task: Task = {
      id: uuid(),
      fromAgentId,
      toAgentId: request.toAgentId || null,
      roomId,
      target: request.target,
      title: request.title,
      description: request.description,
      blocking: request.blocking ?? false,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    this.tasks.set(task.id, task);
    console.log(`Task created: ${task.title} (${task.id}) in room ${roomId}`);

    // Notify via WebSocket based on target
    if (task.target?.agentId) {
      wsService.sendToAgent(task.target.agentId, {
        type: 'task_created',
        payload: { task },
        timestamp: now,
      });
    } else if (task.target?.agentName) {
      const targetAgent = agentService.getAgentByName(task.target.agentName, roomId);
      if (targetAgent) {
        wsService.sendToAgent(targetAgent.id, {
          type: 'task_created',
          payload: { task },
          timestamp: now,
        });
      }
    } else if (task.target?.skill) {
      wsService.broadcastToAgentsWithSkill(roomId, task.target.skill, {
        type: 'task_created',
        payload: { task },
        timestamp: now,
      }, fromAgentId);
    } else {
      wsService.broadcastToRoomWorkers(roomId, {
        type: 'task_created',
        payload: { task },
        timestamp: now,
      }, fromAgentId);
    }

    return task;
  }

  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  getPendingTasks(excludeAgentId?: string, roomId?: string): Task[] {
    return Array.from(this.tasks.values()).filter(
      (task) =>
        task.status === 'pending' &&
        (!excludeAgentId || task.fromAgentId !== excludeAgentId) &&
        (!roomId || task.roomId === roomId)
    );
  }

  getPendingTasksForAgent(agentId: string, roomId: string, agentSkills: string[]): Task[] {
    const agent = agentService.getAgent(agentId);
    if (!agent) return [];

    return Array.from(this.tasks.values()).filter((task) => {
      if (task.status !== 'pending') return false;
      if (task.roomId !== roomId) return false;
      if (task.fromAgentId === agentId) return false;

      const target = task.target;

      if (target?.agentId) {
        return target.agentId === agentId;
      }

      if (target?.agentName) {
        return target.agentName === agent.name;
      }

      if (target?.skill) {
        return agentSkills.includes(target.skill);
      }

      if (agent.role === 'leader') {
        return false;
      }

      return true;
    });
  }

  getTasksForAgent(agentId: string): Task[] {
    return Array.from(this.tasks.values()).filter(
      (task) => task.fromAgentId === agentId || task.toAgentId === agentId
    );
  }

  getActiveTasksForAgent(agentId: string): Task[] {
    return Array.from(this.tasks.values()).filter(
      (task) =>
        task.toAgentId === agentId &&
        (task.status === 'assigned' || task.status === 'in_progress')
    );
  }

  acceptTask(taskId: string, agentId: string): Task | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    if (task.status !== 'pending') {
      return null;
    }

    if (task.fromAgentId === agentId) {
      return null; // Can't accept own task
    }

    task.toAgentId = agentId;
    task.status = 'assigned';
    task.updatedAt = new Date().toISOString();

    console.log(`Task accepted: ${task.title} by agent ${agentId}`);

    // Notify via WebSocket
    wsService.broadcast({
      type: 'task_assigned',
      payload: { task },
      timestamp: task.updatedAt,
    });

    return task;
  }

  updateTaskStatus(taskId: string, agentId: string, status: TaskStatus): Task | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    if (task.toAgentId !== agentId) {
      return null; // Only assigned agent can update
    }

    task.status = status;
    task.updatedAt = new Date().toISOString();

    console.log(`Task status updated: ${task.title} -> ${status}`);

    wsService.broadcast({
      type: 'task_updated',
      payload: { task },
      timestamp: task.updatedAt,
    });

    return task;
  }

  submitResult(taskId: string, agentId: string, result: TaskResult): Task | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    if (task.toAgentId !== agentId) {
      return null; // Only assigned agent can submit result
    }

    task.result = result;
    task.status = result.success ? 'completed' : 'failed';
    task.updatedAt = new Date().toISOString();

    console.log(`Task completed: ${task.title} - success: ${result.success}`);

    // Notify via WebSocket
    wsService.broadcast({
      type: 'task_completed',
      payload: { task },
      timestamp: task.updatedAt,
    });

    return task;
  }

  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  deleteTask(taskId: string, agentId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    // Only the task creator can delete it
    if (task.fromAgentId !== agentId) return false;

    this.tasks.delete(taskId);
    console.log(`Task deleted: ${task.title} (${taskId})`);
    return true;
  }
}

export const taskService = new TaskService();
