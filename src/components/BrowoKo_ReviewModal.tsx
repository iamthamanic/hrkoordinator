/**
 * @file BrowoKo_ReviewModal.tsx
 * @description Modal zum Reviewen von Test-Abgaben mit Image/Video Kommentar-Tools
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Star,
  Send,
  User,
  Calendar,
  Trophy,
  FileText,
  Image as ImageIcon,
  Video as VideoIcon,
  MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabaseUrl, publicAnonKey } from '../utils/supabase/info';
import { useAuthStore } from '../stores/BrowoKo_authStore';
import type { TestSubmission, ReviewComment } from '../types/schemas/BrowoKo_learningSchemas';
import { BrowoKo_ImageCommentTool } from './BrowoKo_ImageCommentTool';
import { BrowoKo_VideoCommentTool } from './BrowoKo_VideoCommentTool';

const API_URL = `${supabaseUrl}/functions/v1/BrowoKoordinator-Server`;

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: TestSubmission & {
    user?: { firstName: string; lastName: string };
    test?: { title: string };
  };
}

export function BrowoKo_ReviewModal({ isOpen, onClose, submission }: ReviewModalProps) {
  const currentUser = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(false);
  const [testBlocks, setTestBlocks] = useState<any[]>([]);
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [reviewDecision, setReviewDecision] = useState<'approve' | 'needs_revision' | 'fail' | null>(null);
  const [reviewReason, setReviewReason] = useState('');
  const [reviewStars, setReviewStars] = useState(3);

  // Fetch test blocks and comments
  useEffect(() => {
    if (isOpen && submission.id) {
      fetchTestBlocks();
      fetchComments();
    }
  }, [isOpen, submission.id]);

  const fetchTestBlocks = async () => {
    try {
      const response = await fetch(`${API_URL}/tests/${submission.testId}/blocks`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
      });
      const result = await response.json();
      if (result.success) {
        setTestBlocks(result.data || []);
      }
    } catch (error) {
      console.error('❌ Error fetching test blocks:', error);
    }
  };

  const fetchComments = async () => {
    try {
      const response = await fetch(
        `${API_URL}/tests/submissions/${submission.id}/comments`,
        { headers: { 'Authorization': `Bearer ${publicAnonKey}` } }
      );
      const result = await response.json();
      if (result.success) {
        setComments(result.data || []);
      }
    } catch (error) {
      console.error('❌ Error fetching comments:', error);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewDecision) {
      toast.error('Bitte wähle eine Entscheidung (Genehmigen/Überarbeitung/Ablehnen)');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `${API_URL}/tests/submissions/${submission.id}/review`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            decision: reviewDecision,
            reason: reviewReason || undefined,
            stars: reviewStars,
          }),
        }
      );

      const result = await response.json();
      if (result.success) {
        toast.success('Review erfolgreich gespeichert!');
        onClose();
      } else {
        throw new Error(result.error || 'Review fehlgeschlagen');
      }
    } catch (error: any) {
      console.error('❌ Error submitting review:', error);
      toast.error(error.message || 'Fehler beim Speichern des Reviews');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const practicalBlocks = testBlocks.filter(
    (block) => block.type === 'PRACTICAL_IMAGE' || block.type === 'PRACTICAL_VIDEO'
  );

  const autoBlocks = testBlocks.filter(
    (block) => !['PRACTICAL_IMAGE', 'PRACTICAL_VIDEO'].includes(block.type)
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-blue-600" />
            Test-Abgabe Review
          </DialogTitle>
          <DialogDescription>
            Review der Abgabe von {submission.user?.firstName} {submission.user?.lastName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Submission Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">User:</span>
                  <span className="font-medium">
                    {submission.user?.firstName} {submission.user?.lastName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Test:</span>
                  <span className="font-medium">{submission.test?.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Abgegeben:</span>
                  <span className="font-medium">{formatDate(submission.submittedAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Versuch:</span>
                  <Badge variant="secondary">{submission.attemptNumber}/3</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {submission.autoPercentage?.toFixed(0) || 0}%
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Auto-Score</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {submission.autoScore}/{submission.autoMaxScore} Punkte
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {submission.finalPercentage?.toFixed(0) || 0}%
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Final Score</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {submission.finalScore} Punkte
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2">
                    {submission.passed ? (
                      <>
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                        <span className="text-lg font-medium text-green-600">Bestanden</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-6 h-6 text-red-600" />
                        <span className="text-lg font-medium text-red-600">Nicht bestanden</span>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs for Auto-Antworten and Praktische Aufgaben */}
          <Tabs defaultValue="practical">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="practical">
                <ImageIcon className="w-4 h-4 mr-2" />
                Praktische Aufgaben ({practicalBlocks.length})
              </TabsTrigger>
              <TabsTrigger value="auto">
                <MessageSquare className="w-4 h-4 mr-2" />
                Auto-Antworten ({autoBlocks.length})
              </TabsTrigger>
            </TabsList>

            {/* Praktische Aufgaben */}
            <TabsContent value="practical" className="space-y-4">
              {practicalBlocks.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-gray-400">
                    Keine praktischen Aufgaben
                  </CardContent>
                </Card>
              ) : (
                practicalBlocks.map((block) => {
                  const submissionData = (submission.practicalSubmissions as any[])?.find(
                    (ps: any) => ps.blockId === block.id
                  );

                  if (!submissionData) return null;

                  return block.type === 'PRACTICAL_IMAGE' ? (
                    <BrowoKo_ImageCommentTool
                      key={block.id}
                      block={block}
                      submissionData={submissionData}
                      submissionId={submission.id!}
                      comments={comments.filter((c) => c.blockId === block.id)}
                      onCommentsChange={fetchComments}
                    />
                  ) : (
                    <BrowoKo_VideoCommentTool
                      key={block.id}
                      block={block}
                      submissionData={submissionData}
                      submissionId={submission.id!}
                      comments={comments.filter((c) => c.blockId === block.id)}
                      onCommentsChange={fetchComments}
                    />
                  );
                })
              )}
            </TabsContent>

            {/* Auto-Antworten */}
            <TabsContent value="auto" className="space-y-4">
              {autoBlocks.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-gray-400">
                    Keine automatisch bewerteten Fragen
                  </CardContent>
                </Card>
              ) : (
                autoBlocks.map((block, idx) => {
                  const answer = (submission.autoAnswers as any)?.[block.id];
                  return (
                    <Card key={block.id}>
                      <CardContent className="pt-6">
                        <div className="mb-3 font-medium">
                          {idx + 1}. {block.question}
                        </div>
                        <div className="text-sm text-gray-600">
                          <strong>Antwort:</strong> {answer || '-'}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>
          </Tabs>

          {/* Review Decision */}
          {submission.status === 'PENDING_REVIEW' && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardContent className="pt-6 space-y-4">
                <Label className="text-base font-medium">Review Entscheidung</Label>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Button
                    variant={reviewDecision === 'approve' ? 'default' : 'outline'}
                    className={reviewDecision === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
                    onClick={() => setReviewDecision('approve')}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Genehmigen
                  </Button>
                  <Button
                    variant={reviewDecision === 'needs_revision' ? 'default' : 'outline'}
                    className={reviewDecision === 'needs_revision' ? 'bg-orange-600 hover:bg-orange-700' : ''}
                    onClick={() => setReviewDecision('needs_revision')}
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Überarbeitung
                  </Button>
                  <Button
                    variant={reviewDecision === 'fail' ? 'default' : 'outline'}
                    className={reviewDecision === 'fail' ? 'bg-red-600 hover:bg-red-700' : ''}
                    onClick={() => setReviewDecision('fail')}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Ablehnen
                  </Button>
                </div>

                <div>
                  <Label>Bewertung (Sterne)</Label>
                  <div className="flex gap-2 mt-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewStars(star)}
                        className="focus:outline-none"
                      >
                        <Star
                          className={`w-8 h-8 ${
                            star <= reviewStars
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Kommentar (optional)</Label>
                  <Textarea
                    placeholder="Begründung für die Entscheidung..."
                    value={reviewReason}
                    onChange={(e) => setReviewReason(e.target.value)}
                    rows={4}
                    className="mt-2"
                  />
                </div>

                <Button
                  onClick={handleSubmitReview}
                  disabled={loading || !reviewDecision}
                  className="w-full"
                  size="lg"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {loading ? 'Wird gespeichert...' : 'Review abschließen'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Already reviewed */}
          {submission.status !== 'PENDING_REVIEW' && submission.reviewedAt && (
            <Card className="border-gray-200 bg-gray-50/50">
              <CardContent className="pt-6">
                <div className="text-sm text-gray-600 space-y-2">
                  <div>
                    <strong>Reviewed:</strong> {formatDate(submission.reviewedAt)}
                  </div>
                  <div>
                    <strong>Entscheidung:</strong>{' '}
                    <Badge variant="outline">
                      {submission.reviewDecision === 'approve' && 'Genehmigt'}
                      {submission.reviewDecision === 'needs_revision' && 'Überarbeitung nötig'}
                      {submission.reviewDecision === 'fail' && 'Abgelehnt'}
                    </Badge>
                  </div>
                  {submission.reviewStars && (
                    <div className="flex items-center gap-2">
                      <strong>Bewertung:</strong>
                      <div className="flex gap-1">
                        {Array.from({ length: submission.reviewStars }).map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                    </div>
                  )}
                  {submission.reviewReason && (
                    <div>
                      <strong>Kommentar:</strong>
                      <p className="mt-1 text-gray-700">{submission.reviewReason}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}