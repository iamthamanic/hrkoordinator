/**
 * @file TasksScreen.tsx
 * @domain HR - Task Management
 * @description Kanban-style task management with multiple boards
 * @created v4.10.16
 */

import { useState, useEffect } from 'react';
import { Plus, LayoutGrid } from 'lucide-react';
import { BrowoKo_KanbanBoard } from '../components/BrowoKo_KanbanBoard';
import { BrowoKo_CreateBoardModal } from '../components/BrowoKo_CreateBoardModal';
import { BrowoKo_TaskModal } from '../components/BrowoKo_TaskModal';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { useAuthStore } from '../stores/BrowoKo_authStore';
import { supabaseUrl, publicAnonKey } from '../utils/supabase/info';

interface Board {
  id: string;
  name: string;
  description?: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  due_date?: string;
  team_id?: string;
  created_by: string;
  assignments?: any[];
  creator?: any;
}

export default function TasksScreen() {
  const { user } = useAuthStore();
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateBoardModal, setShowCreateBoardModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    loadBoards();
  }, []);

  useEffect(() => {
    if (selectedBoard) {
      loadTasks(selectedBoard.id);
    }
  }, [selectedBoard]);

  const getAuthToken = async () => {
    try {
      if (user && typeof user.getIdToken === 'function') {
        return await user.getIdToken();
      }
      return publicAnonKey;
    } catch {
      return publicAnonKey;
    }
  };

  const loadBoards = async () => {
    try {
      const token = await getAuthToken();
      
      // Get teams as boards (using BrowoKoordinator-Server or create a boards endpoint)
      // For now, we'll use a simple approach with localStorage
      const savedBoards = localStorage.getItem('kanban_boards');
      if (savedBoards) {
        const parsedBoards = JSON.parse(savedBoards);
        setBoards(parsedBoards);
        if (parsedBoards.length > 0 && !selectedBoard) {
          setSelectedBoard(parsedBoards[0]);
        }
      } else {
        // Create default board
        const defaultBoard = {
          id: 'default',
          name: 'Mein Board',
          description: 'Standard-Board'
        };
        setBoards([defaultBoard]);
        setSelectedBoard(defaultBoard);
        localStorage.setItem('kanban_boards', JSON.stringify([defaultBoard]));
      }
    } catch (error) {
      console.error('Load boards error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async (boardId: string) => {
    try {
      const token = await getAuthToken();
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/BrowoKoordinator-Tasks/tasks?team_id=${boardId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setTasks(data.tasks || []);
        }
      }
    } catch (error) {
      console.error('Load tasks error:', error);
    }
  };

  const handleCreateBoard = (board: Board) => {
    const newBoards = [...boards, board];
    setBoards(newBoards);
    localStorage.setItem('kanban_boards', JSON.stringify(newBoards));
    setSelectedBoard(board);
    setShowCreateBoardModal(false);
  };

  const handleCreateTask = () => {
    setSelectedTask(null);
    setShowTaskModal(true);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const handleTaskSaved = async () => {
    setShowTaskModal(false);
    setSelectedTask(null);
    if (selectedBoard) {
      await loadTasks(selectedBoard.id);
    }
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: 'TODO' | 'IN_PROGRESS' | 'DONE') => {
    try {
      const token = await getAuthToken();
      
      const response = await fetch(
        `${supabaseUrl}/functions/v1/BrowoKoordinator-Tasks/tasks/${taskId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: newStatus }),
        }
      );

      if (response.ok) {
        if (selectedBoard) {
          await loadTasks(selectedBoard.id);
        }
      }
    } catch (error) {
      console.error('Update task status error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Lade Boards...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl">Tasks</h1>
          
          {/* Board Selector */}
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-5 h-5 text-gray-400" />
            <select
              value={selectedBoard?.id || ''}
              onChange={(e) => {
                const board = boards.find(b => b.id === e.target.value);
                if (board) setSelectedBoard(board);
              }}
              className="px-3 py-1.5 border border-gray-200 rounded-lg bg-white text-sm"
            >
              {boards.map(board => (
                <option key={board.id} value={board.id}>
                  {board.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateBoardModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Neues Board
          </Button>
          <Button
            size="sm"
            onClick={handleCreateTask}
            disabled={!selectedBoard}
          >
            <Plus className="w-4 h-4 mr-2" />
            Neue Task
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      {selectedBoard ? (
        <BrowoKo_KanbanBoard
          tasks={tasks}
          onTaskClick={handleTaskClick}
          onTaskStatusChange={handleTaskStatusChange}
        />
      ) : (
        <Card className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-gray-500 mb-4">Kein Board ausgewählt</p>
            <Button onClick={() => setShowCreateBoardModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Erstes Board erstellen
            </Button>
          </div>
        </Card>
      )}

      {/* Modals */}
      {showCreateBoardModal && (
        <BrowoKo_CreateBoardModal
          onClose={() => setShowCreateBoardModal(false)}
          onSave={handleCreateBoard}
        />
      )}

      {showTaskModal && (
        <BrowoKo_TaskModal
          task={selectedTask}
          boardId={selectedBoard?.id}
          onClose={() => {
            setShowTaskModal(false);
            setSelectedTask(null);
          }}
          onSave={handleTaskSaved}
        />
      )}
    </div>
  );
}
