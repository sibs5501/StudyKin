import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Send, Image, Mic, Upload, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface MessageProfile {
  first_name: string | null;
  last_name: string | null;
}

interface Message {
  id: string;
  content: string | null;
  message_type: 'text' | 'image' | 'voice';
  file_url: string | null;
  created_at: string;
  user_id: string;
  profiles: MessageProfile | null;
}

interface Group {
  id: string;
  name: string;
  topic: string;
}

interface GroupChatProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string | null;
  onBack: () => void;
}

export const GroupChat = ({ open, onOpenChange, groupId, onBack }: GroupChatProps) => {
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && groupId && user) {
      fetchGroup();
      fetchMessages();
      subscribeToMessages();
      
      // Request notification permission when chat opens
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }

    return () => {
      // Clean up subscription
      supabase.removeAllChannels();
    };
  }, [open, groupId, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchGroup = async () => {
    if (!groupId) return;

    try {
      const { data, error } = await supabase
        .from('groups')
        .select('id, name, topic')
        .eq('id', groupId)
        .single();

      if (error) throw error;
      setGroup(data);
    } catch (error) {
      console.error('Error fetching group:', error);
    }
  };

  const fetchMessages = async () => {
    if (!groupId) return;

    try {
      const { data: messageData, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          message_type,
          file_url,
          created_at,
          user_id
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch profiles separately to avoid relation issues
      const userIds = [...new Set(messageData?.map(m => m.user_id) || [])];
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', userIds);

      // Combine messages with profiles
      const messagesWithProfiles: Message[] = messageData?.map(msg => ({
        ...msg,
        message_type: msg.message_type as 'text' | 'image' | 'voice',
        profiles: profileData?.find(p => p.id === msg.user_id) || null
      })) || [];

      setMessages(messagesWithProfiles);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const subscribeToMessages = () => {
    if (!groupId) return;

    const channel = supabase
      .channel(`group-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `group_id=eq.${groupId}`
        },
        async (payload) => {
          // Fetch the complete message with profile data
          const { data: profile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', payload.new.user_id)
            .maybeSingle();

          const newMessage: Message = {
            id: payload.new.id,
            content: payload.new.content,
            message_type: payload.new.message_type as 'text' | 'image' | 'voice',
            file_url: payload.new.file_url,
            created_at: payload.new.created_at,
            user_id: payload.new.user_id,
            profiles: profile || null
          };

          setMessages(prev => [...prev, newMessage]);

          // Show notification for messages from other users
          if (payload.new.user_id !== user?.id) {
            const senderName = profile ? `${profile.first_name} ${profile.last_name}` : 'Someone';
            let notificationContent = '';
            
            switch (payload.new.message_type) {
              case 'text':
                notificationContent = payload.new.content || 'New message';
                break;
              case 'image':
                notificationContent = 'Sent an image';
                break;
              case 'voice':
                notificationContent = 'Sent a voice note';
                break;
              default:
                notificationContent = 'Sent a message';
            }

            toast(`${senderName}: ${notificationContent}`, {
              description: `In ${group?.name || 'group chat'}`,
              duration: 4000,
            });

            // Browser notification if supported and permission granted
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(`${senderName} - ${group?.name || 'Study Group'}`, {
                body: notificationContent,
                icon: '/placeholder.svg'
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !groupId || !user) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          group_id: groupId,
          user_id: user.id,
          content: newMessage.trim(),
          message_type: 'text'
        });

      if (error) throw error;
      setNewMessage("");
    } catch (error: any) {
      console.error('Error sending message:', error);
      toast.error(error.message || "Failed to send message");
    }
  };

  const uploadFile = async (file: File, type: 'image' | 'voice') => {
    if (!groupId || !user) return;

    const bucket = type === 'image' ? 'group-images' : 'group-voice';
    const fileExt = file.name.split('.').pop();
    const fileName = `${groupId}/${user.id}-${Date.now()}.${fileExt}`;

    try {
      // Show uploading feedback
      toast.loading(`Uploading ${type === 'image' ? 'image' : 'voice note'}...`, {
        id: `upload-${type}`
      });

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          group_id: groupId,
          user_id: user.id,
          content: type === 'image' ? 'Shared an image' : 'Shared a voice note',
          message_type: type,
          file_url: data.publicUrl
        });

      if (messageError) throw messageError;

      toast.success(`${type === 'image' ? 'Image' : 'Voice note'} shared successfully!`, {
        id: `upload-${type}`
      });
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error(error.message || "Failed to upload file", {
        id: `upload-${type}`
      });
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        if (file.size > 5 * 1024 * 1024) { // 5MB limit
          toast.error("Image file must be less than 5MB");
          return;
        }
        uploadFile(file, 'image');
      } else {
        toast.error("Please select a valid image file");
      }
    }
    // Reset input
    event.target.value = '';
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const audioChunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], 'voice-note.webm', { type: 'audio/webm' });
        uploadFile(audioFile, 'voice');
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error("Failed to start recording");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setMediaRecorder(null);
      setIsRecording(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getInitials = (firstName: string | null, lastName: string | null) => {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="p-1"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="font-semibold">{group?.name}</div>
              <div className="text-sm text-muted-foreground font-normal">
                Topic: {group?.topic}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-4 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.user_id === user?.id ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`flex gap-3 max-w-[70%] ${
                    message.user_id === user?.id ? 'flex-row-reverse' : ''
                  }`}
                >
                  <Avatar className="w-8 h-8 mt-1">
                    <AvatarFallback className="text-xs">
                      {getInitials(
                        message.profiles?.first_name || null,
                        message.profiles?.last_name || null
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <Card
                    className={`p-3 ${
                      message.user_id === user?.id
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="text-xs opacity-70">
                        {message.profiles?.first_name} {message.profiles?.last_name}
                      </div>
                      {message.message_type === 'text' && (
                        <div className="text-sm">{message.content}</div>
                      )}
                      {message.message_type === 'image' && message.file_url && (
                        <div className="space-y-1">
                          <img
                            src={message.file_url}
                            alt="Shared image"
                            className="max-w-full rounded border"
                          />
                          <div className="text-sm">{message.content}</div>
                        </div>
                      )}
                       {message.message_type === 'voice' && message.file_url && (
                         <div className="space-y-1">
                           <audio controls className="max-w-full" preload="metadata">
                             <source src={message.file_url} type="audio/webm" />
                             <source src={message.file_url} type="audio/ogg" />
                             <source src={message.file_url} type="audio/mp3" />
                             Your browser does not support the audio element.
                           </audio>
                           <div className="text-sm">{message.content}</div>
                         </div>
                       )}
                      <div className="text-xs opacity-60">
                        {formatTime(message.created_at)}
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="border-t p-4">
          <div className="flex gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              ref={fileInputRef}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={!groupId}
            >
              <Image className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={!groupId}
              className={isRecording ? 'bg-red-500 text-white' : ''}
            >
              <Mic className="h-4 w-4" />
            </Button>
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              disabled={!groupId}
            />
            <Button
              onClick={sendMessage}
              disabled={!newMessage.trim() || !groupId}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};