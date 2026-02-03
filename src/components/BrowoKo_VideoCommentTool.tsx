/**
 * @file BrowoKo_VideoCommentTool.tsx
 * @description Tool zum Kommentieren von hochgeladenen Videos (mit Timestamp)
 */

import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Play, Pause, MessageSquare, X, Send, Video as VideoIcon, Trash2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { supabaseUrl, publicAnonKey } from '../utils/supabase/info';
import { useAuthStore } from '../stores/BrowoKo_authStore';
import type { ReviewComment } from '../types/schemas/BrowoKo_learningSchemas';

const API_URL = `${supabaseUrl}/functions/v1/BrowoKoordinator-Server`;

interface VideoCommentToolProps {
  block: any;
  submissionData: any;
  submissionId: string;
  comments: ReviewComment[];
  onCommentsChange: () => void;
}

export function BrowoKo_VideoCommentTool({
  block,
  submissionData,
  submissionId,
  comments,
  onCommentsChange,
}: VideoCommentToolProps) {
  const currentUser = useAuthStore((state) => state.user);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');
  const [newCommentTimestamp, setNewCommentTimestamp] = useState(0);
  const [saving, setSaving] = useState(false);

  const handlePlayPause = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  const handleAddCommentAtCurrentTime = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    setNewCommentTimestamp(currentTime);
    setIsAddingComment(true);
    setNewCommentText('');
  };

  const handleSaveComment = async () => {
    if (!newCommentText.trim()) {
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
            type: 'video',
            timestamp: newCommentTimestamp,
            text: newCommentText,
          }),
        }
      );

      const result = await response.json();
      if (result.success) {
        toast.success('Kommentar gespeichert');
        setIsAddingComment(false);
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

  const seekToTimestamp = (timestamp: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = timestamp;
    setCurrentTime(timestamp);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Sort comments by timestamp
  const sortedComments = [...comments].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <VideoIcon className="w-5 h-5 text-blue-600" />
          {block.question}
          <Badge variant="secondary" className="ml-auto">
            Video-Upload
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Video Player */}
        <div className="relative bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            src={submissionData.fileUrl}
            className="w-full"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={() => setIsPlaying(false)}
          />

          {/* Play/Pause Button Overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {!isPlaying && (
              <button
                onClick={handlePlayPause}
                className="pointer-events-auto w-16 h-16 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors"
              >
                <Play className="w-8 h-8 text-gray-900 ml-1" />
              </button>
            )}
          </div>

          {/* Video Controls */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePlayPause}
                className="text-white hover:bg-white/20"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>

              <div className="flex-1">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={(e) => {
                    const time = parseFloat(e.target.value);
                    seekToTimestamp(time);
                  }}
                  className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer slider"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${
                      (currentTime / duration) * 100
                    }%, rgba(255,255,255,0.3) ${(currentTime / duration) * 100}%, rgba(255,255,255,0.3) 100%)`,
                  }}
                />
              </div>

              <span className="text-white text-sm font-medium min-w-[80px] text-right">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddCommentAtCurrentTime}
                className="text-white hover:bg-white/20"
              >
                <MessageSquare className="w-5 h-5 mr-2" />
                Kommentar
              </Button>
            </div>
          </div>

          {/* Comment Markers on Timeline */}
          {sortedComments.map((comment) => {
            const position = ((comment.timestamp || 0) / duration) * 100;
            return (
              <div
                key={comment.id}
                className="absolute bottom-[60px] w-1 h-3 bg-red-500 cursor-pointer group"
                style={{ left: `${position}%` }}
                onClick={() => seekToTimestamp(comment.timestamp || 0)}
              >
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                  <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-2 min-w-[150px] max-w-[250px]">
                    <div className="text-xs font-medium text-gray-900 mb-1">
                      {formatTime(comment.timestamp || 0)}
                    </div>
                    <div className="text-xs text-gray-700">{comment.text}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-xs text-gray-500">
          💡 Klicke auf "Kommentar" während das Video läuft um einen Kommentar hinzuzufügen
        </div>

        {/* New Comment Form */}
        {isAddingComment && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-blue-900">Neuer Kommentar</span>
                  <Badge variant="secondary">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatTime(newCommentTimestamp)}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddingComment(false)}
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
        {sortedComments.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">
              Kommentare ({sortedComments.length})
            </div>
            {sortedComments.map((comment) => (
              <div
                key={comment.id}
                className="flex gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                onClick={() => seekToTimestamp(comment.timestamp || 0)}
              >
                <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatTime(comment.timestamp || 0)}
                    </Badge>
                  </div>
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
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteComment(comment.id!);
                    }}
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