/**
 * @file BrowoKo_TestSubmissionsList.tsx
 * @description Liste aller abgegebenen Tests mit Filter und Review-Status
 */

import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { 
  Search, 
  Eye, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle,
  Star,
  User,
  Calendar,
  Trophy
} from 'lucide-react';
import { toast } from 'sonner';
import { supabaseUrl, publicAnonKey } from '../utils/supabase/info';
import { BrowoKo_ReviewModal } from './BrowoKo_ReviewModal';
import type { TestSubmission } from '../types/schemas/BrowoKo_learningSchemas';

const API_URL = `${supabaseUrl}/functions/v1/BrowoKoordinator-Server`;

const statusConfig = {
  DRAFT: { 
    label: 'Entwurf', 
    color: 'bg-gray-100 text-gray-700 border-gray-300',
    icon: Clock 
  },
  PENDING_REVIEW: { 
    label: 'Wartet auf Review', 
    color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    icon: Clock 
  },
  NEEDS_REVISION: { 
    label: 'Überarbeitung nötig', 
    color: 'bg-orange-100 text-orange-700 border-orange-300',
    icon: AlertCircle 
  },
  APPROVED: { 
    label: 'Genehmigt', 
    color: 'bg-green-100 text-green-700 border-green-300',
    icon: CheckCircle2 
  },
  FAILED: { 
    label: 'Nicht bestanden', 
    color: 'bg-red-100 text-red-700 border-red-300',
    icon: XCircle 
  },
};

interface SubmissionWithDetails {
  id: string;
  test_id: string;
  user_id: string;
  status: string;
  score_percentage: number | null;
  submitted_at: string;
  reviewed_at: string | null;
  reviewer_id: string | null;
  attempt_number?: number;
  final_percentage?: number;
  passed?: boolean;
  submittedAt?: string;
  attemptNumber?: number;
  finalPercentage?: number;
  test: {
    id: string;
    title: string;
    pass_percentage: number;
  };
  user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  reviewer?: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
}

export function BrowoKo_TestSubmissionsList({ isActive = true }: { isActive?: boolean }) {
  const [submissions, setSubmissions] = useState<SubmissionWithDetails[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<SubmissionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionWithDetails | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  const fetchSubmissions = async () => {
    if (!isActive) return; // Don't load if tab is not active
    
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/submissions`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
        },
      });
      const result = await response.json();
      if (result.success) {
        setSubmissions(result.data || []);
        setFilteredSubmissions(result.data || []);
      } else {
        throw new Error(result.error || 'Failed to load submissions');
      }
    } catch (error: any) {
      console.error('❌ Error fetching submissions:', error);
      toast.error('Fehler beim Laden der Abgaben');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isActive) {
      fetchSubmissions();
    }
  }, [isActive]);

  // Filter logic
  useEffect(() => {
    let filtered = submissions;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(sub => sub.status === statusFilter);
    }

    // Search filter (user name or test title)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(sub => {
        const userName = `${sub.user?.first_name} ${sub.user?.last_name}`.toLowerCase();
        const testTitle = sub.test?.title?.toLowerCase() || '';
        return userName.includes(query) || testTitle.includes(query);
      });
    }

    setFilteredSubmissions(filtered);
  }, [searchQuery, statusFilter, submissions]);

  const handleOpenReview = (submission: SubmissionWithDetails) => {
    setSelectedSubmission(submission);
    setIsReviewModalOpen(true);
  };

  const handleReviewComplete = () => {
    setIsReviewModalOpen(false);
    setSelectedSubmission(null);
    fetchSubmissions(); // Refresh list
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

  if (loading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <span className="ml-3 text-gray-600">Lade Abgaben...</span>
        </div>
      </Card>
    );
  }

  if (submissions.length === 0) {
    return (
      <Card className="p-12">
        <div className="text-center text-gray-400">
          <CheckCircle2 className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium mb-2">Keine abgegebenen Tests</p>
          <p className="text-sm">Hier siehst du alle Tests die von Usern abgegeben wurden und auf Review warten</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="p-6">
        {/* Header with filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Suche nach User oder Test..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Status filtern" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Status</SelectItem>
              <SelectItem value="PENDING_REVIEW">Wartet auf Review</SelectItem>
              <SelectItem value="NEEDS_REVISION">Überarbeitung nötig</SelectItem>
              <SelectItem value="APPROVED">Genehmigt</SelectItem>
              <SelectItem value="FAILED">Nicht bestanden</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Results count */}
        <div className="mb-4 text-sm text-gray-600">
          {filteredSubmissions.length} {filteredSubmissions.length === 1 ? 'Abgabe' : 'Abgaben'} gefunden
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Test</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Versuch</TableHead>
                <TableHead className="text-center">Score</TableHead>
                <TableHead className="hidden md:table-cell">Abgegeben</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubmissions.map((submission) => {
                const StatusIcon = statusConfig[submission.status]?.icon || Clock;
                return (
                  <TableRow key={submission.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {submission.user?.first_name} {submission.user?.last_name}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate" title={submission.test?.title}>
                        {submission.test?.title || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={statusConfig[submission.status]?.color || ''}
                      >
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusConfig[submission.status]?.label || submission.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">
                        {submission.attemptNumber}/3
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {submission.passed ? (
                          <Trophy className="w-4 h-4 text-green-600" />
                        ) : null}
                        <span className={submission.passed ? 'text-green-600 font-medium' : ''}>
                          {submission.finalPercentage?.toFixed(0) || '0'}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(submission.submittedAt)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenReview(submission)}
                        className="gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        <span className="hidden sm:inline">
                          {submission.status === 'PENDING_REVIEW' ? 'Reviewen' : 'Ansehen'}
                        </span>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {filteredSubmissions.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Keine Abgaben gefunden</p>
          </div>
        )}
      </Card>

      {/* Review Modal */}
      {selectedSubmission && (
        <BrowoKo_ReviewModal
          isOpen={isReviewModalOpen}
          onClose={handleReviewComplete}
          submission={selectedSubmission}
        />
      )}
    </>
  );
}