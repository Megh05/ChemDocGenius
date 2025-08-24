import { useState } from "react";
import { Search, Eye, Download, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Document } from "@shared/schema";

interface HistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function HistoryModal({ open, onOpenChange }: HistoryModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const documentsQuery = useQuery({
    queryKey: ['/api/documents'],
    enabled: open,
  });

  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await apiRequest("DELETE", `/api/documents/${documentId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({
        title: "Document Deleted",
        description: "The document has been removed from your history.",
      });
    },
  });

  const downloadMutation = useMutation({
    mutationFn: async ({ documentId, format }: { documentId: string; format: string }) => {
      const response = await apiRequest("POST", `/api/documents/${documentId}/generate`, { format });
      return { blob: await response.blob(), documentId };
    },
    onSuccess: ({ blob, documentId }) => {
      const doc = documents?.find(d => d.id === documentId);
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${doc?.originalFileName?.replace('.pdf', '')}_company.pdf`;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
    },
  });

  const documents = documentsQuery.data as Document[] | undefined;

  const filteredDocuments = documents?.filter(doc =>
    doc.originalFileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ((doc.extractedData as any)?.supplier?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleDelete = (documentId: string) => {
    if (confirm("Are you sure you want to delete this document?")) {
      deleteMutation.mutate(documentId);
    }
  };

  const handleDownload = (documentId: string) => {
    downloadMutation.mutate({ documentId, format: "pdf" });
  };

  const getDocumentIcon = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-600";
      case "processed":
        return "bg-blue-100 text-blue-600";
      case "error":
        return "bg-red-100 text-red-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-hidden" data-testid="modal-history">
        <DialogHeader>
          <DialogTitle>Document History</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search-documents"
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
          </div>
          
          {/* Documents List */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {documentsQuery.isLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading documents...</p>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500" data-testid="text-no-documents">
                  {searchTerm ? "No documents found matching your search." : "No documents in history yet."}
                </p>
              </div>
            ) : (
              filteredDocuments.map((document) => (
                <div
                  key={document.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  data-testid={`document-item-${document.id}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getDocumentIcon(document.status)}`}>
                      <Eye className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900" data-testid={`text-document-title-${document.id}`}>
                        {(document.extractedData as any)?.product?.name || document.originalFileName}
                      </h4>
                      <p className="text-sm text-gray-500">
                        Processed on {document.processedAt ? new Date(document.processedAt).toLocaleDateString() : "N/A"}
                      </p>
                      <p className="text-xs text-gray-400">
                        Supplier: {(document.extractedData as any)?.supplier?.name || "Unknown"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(document.id)}
                      disabled={downloadMutation.isPending}
                      data-testid={`button-download-${document.id}`}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(document.id)}
                      disabled={deleteMutation.isPending}
                      className="text-red-600 hover:text-red-700"
                      data-testid={`button-delete-${document.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
