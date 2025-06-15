"use client";

import { useState, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Upload,
  File,
  Trash2,
  Download,
  RefreshCw,
  FileText,
  Image,
  Archive,
  HardDrive,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Attachment {
  id: number;
  name: string;
  original_name: string;
  file_size: number;
  mime_type: string;
  category: string;
  description?: string;
  created_at: string;
  r2_key: string;
}

interface StorageQuota {
  usedBytes: number;
  maxBytes: number;
  usedMB: number;
  maxMB: number;
  remainingBytes: number;
  remainingMB: number;
  percentageUsed: number;
  canUpload: boolean;
}

const categories = [
  { value: "resume", label: "Resume/CV", icon: FileText },
  { value: "portfolio", label: "Portfolio", icon: Image },
  { value: "cover-letter", label: "Cover Letter", icon: FileText },
  { value: "certificate", label: "Certificate", icon: Archive },
  { value: "document", label: "Document", icon: File },
  { value: "image", label: "Image", icon: Image },
  { value: "general", label: "General", icon: File },
];

export function AttachmentsManager() {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [quota, setQuota] = useState<StorageQuota | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadForm, setUploadForm] = useState({
    name: "",
    category: "general",
    description: "",
  });
  const { toast } = useToast();

  const fetchAttachments = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/attachments");
      if (!response.ok) throw new Error("Failed to fetch attachments");

      const data = await response.json();
      setAttachments(data.attachments || []);
      setQuota(data.quota || null);
    } catch (error) {
      console.error("Error fetching attachments:", error);
      toast({
        title: "Error",
        description: "Failed to fetch attachments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttachments();
  }, []);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];

        // Check file size before allowing upload
        if (quota && !quota.canUpload) {
          toast({
            title: "Storage Full",
            description:
              "You have reached your storage limit. Please delete some files first.",
            variant: "destructive",
          });
          return;
        }

        const fileSizeMB = file.size / (1024 * 1024);
        if (quota && fileSizeMB > quota.remainingMB) {
          toast({
            title: "File Too Large",
            description: `File size (${fileSizeMB.toFixed(
              2
            )}MB) exceeds remaining storage (${quota.remainingMB.toFixed(
              2
            )}MB)`,
            variant: "destructive",
          });
          return;
        }

        setSelectedFile(file);
        setUploadForm((prev) => ({
          ...prev,
          name: file.name,
        }));
        setIsDialogOpen(true);
      }
    },
    [quota, toast]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
      "text/*": [".txt"],
      "application/zip": [".zip"],
      "application/x-zip-compressed": [".zip"],
    },
  });

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("name", uploadForm.name);
      formData.append("category", uploadForm.category);
      formData.append("description", uploadForm.description);

      const response = await fetch("/api/attachments", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || errorData.error || "Upload failed"
        );
      }

      const result = await response.json();

      toast({
        title: "Upload successful",
        description: result.message,
      });

      setIsDialogOpen(false);
      setSelectedFile(null);
      setUploadForm({ name: "", category: "general", description: "" });
      fetchAttachments();
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/attachments?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete attachment");

      toast({
        title: "Attachment deleted",
        description: "File has been removed successfully",
      });

      fetchAttachments();
    } catch (error) {
      console.error("Error deleting attachment:", error);
      toast({
        title: "Error",
        description: "Failed to delete attachment",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (id: number, filename: string) => {
    try {
      const response = await fetch(`/api/attachments/download?id=${id}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Download failed");
      }

      const data = await response.json();

      // Open the presigned URL in a new tab for download
      const link = document.createElement("a");
      link.href = data.downloadUrl;
      link.download = filename;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download started",
        description: `Downloading ${filename}`,
      });
    } catch (error) {
      console.error("Error downloading attachment:", error);
      toast({
        title: "Download failed",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getCategoryIcon = (category: string) => {
    const categoryData = categories.find((cat) => cat.value === category);
    return categoryData ? categoryData.icon : File;
  };

  const getCategoryBadge = (category: string) => {
    const categoryData = categories.find((cat) => cat.value === category);
    return categoryData ? categoryData.label : "Unknown";
  };

  const getStorageColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 75) return "bg-yellow-500";
    return "bg-green-500";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Attachments Manager</CardTitle>
          <CardDescription>Loading attachments...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Storage Quota Card */}
      {quota && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <HardDrive className="h-5 w-5" />
              <span>Storage Usage</span>
            </CardTitle>
            <CardDescription>
              Your file storage quota and usage information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Used: {quota.usedMB.toFixed(2)} MB</span>
                <span>Available: {quota.maxMB} MB</span>
              </div>
              <Progress value={quota.percentageUsed} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{quota.percentageUsed}% used</span>
                <span>{quota.remainingMB.toFixed(2)} MB remaining</span>
              </div>
            </div>

            {quota.percentageUsed >= 90 && (
              <div className="flex items-center space-x-2 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>
                  Storage almost full! Consider deleting unused files.
                </span>
              </div>
            )}

            {!quota.canUpload && (
              <div className="flex items-center space-x-2 text-red-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>Storage full! Delete files to upload new ones.</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Attachments</CardTitle>
          <CardDescription>
            Upload files to attach to your email campaigns.
            {quota && ` Maximum ${quota.maxMB}MB total storage per user.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-primary bg-primary/5"
                : quota?.canUpload === false
                ? "border-red-300 bg-red-50 cursor-not-allowed"
                : "border-muted-foreground/25 hover:border-primary hover:bg-primary/5"
            }`}
          >
            <input {...getInputProps()} disabled={quota?.canUpload === false} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            {quota?.canUpload === false ? (
              <div>
                <p className="text-lg font-medium text-red-600">Storage Full</p>
                <p className="text-sm text-red-500">
                  Delete files to upload new ones
                </p>
              </div>
            ) : isDragActive ? (
              <p className="text-lg font-medium">Drop the file here...</p>
            ) : (
              <div>
                <p className="text-lg font-medium">
                  Drag & drop a file here, or click to select
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Supports PDF, DOC, DOCX, images, TXT, and ZIP files
                  {quota && ` (${quota.remainingMB.toFixed(2)}MB remaining)`}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Attachments List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Attachments ({attachments.length})</CardTitle>
              <CardDescription>
                Manage your uploaded files and documents
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={fetchAttachments}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {attachments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No attachments uploaded yet. Upload some files to get started.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attachments.map((attachment) => (
                    <TableRow key={attachment.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {(() => {
                            const Icon = getCategoryIcon(attachment.category);
                            return <Icon className="h-4 w-4" />;
                          })()}
                          <div>
                            <p className="font-medium">{attachment.name}</p>
                            {attachment.description && (
                              <p className="text-xs text-muted-foreground">
                                {attachment.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getCategoryBadge(attachment.category)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatFileSize(attachment.file_size)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {attachment.mime_type}
                      </TableCell>
                      <TableCell>
                        {new Date(attachment.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleDownload(
                                attachment.id,
                                attachment.original_name
                              )
                            }
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(attachment.id)}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload File</DialogTitle>
            <DialogDescription>
              Configure the details for your file upload
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fileName">File Name</Label>
              <Input
                id="fileName"
                value={uploadForm.name}
                onChange={(e) =>
                  setUploadForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Enter file name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select
                value={uploadForm.category}
                onValueChange={(value) =>
                  setUploadForm((prev) => ({ ...prev, category: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      <div className="flex items-center space-x-2">
                        <category.icon className="h-4 w-4" />
                        <span>{category.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={uploadForm.description}
                onChange={(e) =>
                  setUploadForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Enter a description for this file"
                rows={3}
              />
            </div>
            {selectedFile && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">Selected File:</p>
                <p className="text-sm text-muted-foreground">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={uploading || !selectedFile || !uploadForm.name}
              >
                {uploading ? "Uploading..." : "Upload File"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
