import { v4 as uuid } from 'uuid';
import type { Task, TaskStatus, TaskResult, CreateTaskRequest } from '@merge/shared-types';
import { wsService } from './ws.service.js';

class TaskService {
  private tasks: Map<string, Task> = new Map();

  createTask(fromAgentId: string, request: CreateTaskRequest): Task {
    const now = new Date().toISOString();
    const task: Task = {
      id: uuid(),
      fromAgentId,
      toAgentId: request.toAgentId || null,
      title: request.title,
      description: request.description,
      blocking: request.blocking ?? false,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    this.tasks.set(task.id, task);
    console.log(`Task created: ${task.title} (${task.id})`);

    // Notify via WebSocket
    wsService.broadcast({
      type: 'task_created',
      payload: { task },
      timestamp: now,
    });

    return task;
  }

  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  getPendingTasks(excludeAgentId?: string): Task[] {
    return Array.from(this.tasks.values()).filter(
      (task) =>
        task.status === 'pending' &&
        (!excludeAgentId || task.fromAgentId !== excludeAgentId)
    );
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
}

export const taskService = new TaskService();
