/**
 * @file BrowoKo_ImageCommentTool.tsx
 * @description Tool zum Kommentieren von hochgeladenen Bildern (mit Klick-Position)
 */

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { MessageSquare, X, Send, Image as ImageIcon, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabaseUrl, publicAnonKey } from '../utils/supabase/info';
import { useAuthStore } from '../stores/BrowoKo_authStore';
import type { ReviewComment } from '../types/schemas/BrowoKo_learningSchemas';

const API_URL = `${supabaseUrl}/functions/v1/BrowoKoordinator-Server`;

interface ImageCommentToolProps {
  block: any;
  submissionData: any;
  submissionId: string;
  comments: ReviewComment[];
  onCommentsChange: () => void;
}

export function BrowoKo_ImageCommentTool({
  block,
  submissionData,
  submissionId,
  comments,
  onCommentsChange,
}: ImageCommentToolProps) {
  const currentUser = useAuthStore((state) => state.user);
  const imageRef = useRef<HTMLImageElement>(null);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [newCommentPosition, setNewCommentPosition] = useState<{ x: number; y: number } | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [saving, setSaving] = useState(false);

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setNewCommentPosition({ x, y });
    setIsAddingComment(true);
    setNewCommentText('');
  };

  const handleSaveComment = async () => {
    if (!newCommentText.trim() || !newCommentPosition) {
      toast.error('Bitte Kommentar eingeben');
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(
        `${API_URL}/tests/submissions/${submissionId}/comments`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            blockId: block.id,
            type: 'image',
            positionX: newCommentPosition.x,
            positionY: newCommentPosition.y,
            text: newCommentText,
          }),
        }
      );

      const result = await response.json();
      if (result.success) {
        toast.success('Kommentar gespeichert');
        setIsAddingComment(false);
        setNewCommentPosition(null);
        setNewCommentText('');
        onCommentsChange();
      } else {
        throw new Error(result.error || 'Fehler beim Speichern');
      }
    } catch (error: any) {
      console.error('❌ Error saving comment:', error);
      toast.error(error.message || 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const response = await fetch(
        `${API_URL}/tests/comments/${commentId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        }
      );

      const result = await response.json();
      if (result.success) {
        toast.success('Kommentar gelöscht');
        onCommentsChange();
      } else {
        throw new Error(result.error || 'Fehler beim Löschen');
      }
    } catch (error: any) {
      console.error('❌ Error deleting comment:', error);
      toast.error(error.message || 'Fehler beim Löschen');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ImageIcon className="w-5 h-5 text-blue-600" />
          {block.question}
          <Badge variant="secondary" className="ml-auto">
            Bild-Upload
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Image with Comments */}
        <div className="relative inline-block max-w-full">
          <img
            ref={imageRef}
            src={submissionData.fileUrl}
            alt="Uploaded submission"
            className="max-w-full h-auto rounded-lg border-2 border-gray-200 cursor-crosshair"
            onClick={handleImageClick}
          />

          {/* Existing Comments */}
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="absolute"
              style={{
                left: `${comment.positionX}%`,
                top: `${comment.positionY}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className="relative group">
                {/* Pin */}
                <div className="w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg cursor-pointer flex items-center justify-center">
                  <MessageSquare className="w-3 h-3 text-white" />
                </div>

                {/* Comment Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                  <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-3 min-w-[200px] max-w-[300px]">
                    <div className="text-sm text-gray-800 mb-2">{comment.text}</div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>
                        {new Date(comment.createdAt!).toLocaleDateString('de-DE')}
                      </span>
                      {currentUser?.id === comment.reviewerId && (
                        <button
                          onClick={() => handleDeleteComment(comment.id!)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* New Comment Position */}
          {newCommentPosition && isAddingComment && (
            <div
              className="absolute"
              style={{
                left: `${newCommentPosition.x}%`,
                top: `${newCommentPosition.y}%`,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className="w-6 h-6 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
            </div>
          )}
        </div>

        <div className="text-xs text-gray-500">
          💡 Klicke auf das Bild um einen Kommentar hinzuzufügen
        </div>

        {/* New Comment Form */}
        {isAddingComment && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">Neuer Kommentar</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsAddingComment(false);
                    setNewCommentPosition(null);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <Textarea
                placeholder="Kommentar eingeben..."
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                rows={3}
                className="bg-white"
                autoFocus
              />
              <Button
                onClick={handleSaveComment}
                disabled={saving || !newCommentText.trim()}
                className="w-full"
              >
                <Send className="w-4 h-4 mr-2" />
                {saving ? 'Wird gespeichert...' : 'Kommentar speichern'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Comments List */}
        {comments.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">
              Kommentare ({comments.length})
            </div>
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-gray-800">{comment.text}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(comment.createdAt!).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                {currentUser?.id === comment.reviewerId && (
                  <button
                    onClick={() => handleDeleteComment(comment.id!)}
                    className="text-red-600 hover:text-red-700 flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}