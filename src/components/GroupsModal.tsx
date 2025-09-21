import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Users, MessageCircle, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Group {
  id: string;
  name: string;
  topic: string;
  description: string;
  created_by: string;
  created_at: string;
  member_count?: number;
  is_member?: boolean;
}

interface GroupsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGroupSelect: (groupId: string) => void;
}

export const GroupsModal = ({ open, onOpenChange, onGroupSelect }: GroupsModalProps) => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [myGroups, setMyGroups] = useState<Group[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: "",
    topic: "",
    description: ""
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && user) {
      fetchGroups();
      fetchMyGroups();
    }
  }, [open, user]);

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select(`
          *,
          group_memberships(count)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Check which groups user is member of
      const { data: memberships } = await supabase
        .from('group_memberships')
        .select('group_id')
        .eq('user_id', user?.id);

      const memberGroupIds = memberships?.map(m => m.group_id) || [];

      const groupsWithMembership = data?.map(group => ({
        ...group,
        member_count: group.group_memberships?.[0]?.count || 0,
        is_member: memberGroupIds.includes(group.id)
      })) || [];

      setGroups(groupsWithMembership);
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const fetchMyGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('group_memberships')
        .select(`
          groups (
            id,
            name,
            topic,
            description,
            created_at
          )
        `)
        .eq('user_id', user?.id);

      if (error) throw error;

      const userGroups = data?.map(membership => membership.groups).filter(Boolean) || [];
      setMyGroups(userGroups as Group[]);
    } catch (error) {
      console.error('Error fetching my groups:', error);
    }
  };

  const createGroup = async () => {
    if (!user || !newGroup.name.trim() || !newGroup.topic.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsLoading(true);
    try {
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: newGroup.name.trim(),
          topic: newGroup.topic.trim(),
          description: newGroup.description.trim(),
          created_by: user.id
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Automatically join the creator to the group
      const { error: membershipError } = await supabase
        .from('group_memberships')
        .insert({
          group_id: group.id,
          user_id: user.id,
          role: 'admin'
        });

      if (membershipError) throw membershipError;

      toast.success("Group created successfully!");
      setNewGroup({ name: "", topic: "", description: "" });
      setIsCreateDialogOpen(false);
      fetchGroups();
      fetchMyGroups();
    } catch (error: any) {
      console.error('Error creating group:', error);
      toast.error(error.message || "Failed to create group");
    } finally {
      setIsLoading(false);
    }
  };

  const joinGroup = async (groupId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('group_memberships')
        .insert({
          group_id: groupId,
          user_id: user.id
        });

      if (error) throw error;

      toast.success("Joined group successfully!");
      fetchGroups();
      fetchMyGroups();
    } catch (error: any) {
      console.error('Error joining group:', error);
      toast.error(error.message || "Failed to join group");
    }
  };

  const leaveGroup = async (groupId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('group_memberships')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success("Left group successfully!");
      fetchGroups();
      fetchMyGroups();
    } catch (error: any) {
      console.error('Error leaving group:', error);
      toast.error(error.message || "Failed to leave group");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Study Groups
            </DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="my-groups" className="flex-1 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="my-groups">My Groups</TabsTrigger>
                <TabsTrigger value="all-groups">All Groups</TabsTrigger>
              </TabsList>
              <Button 
                onClick={() => setIsCreateDialogOpen(true)}
                size="sm"
                className="flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Create Group
              </Button>
            </div>

            <TabsContent value="my-groups" className="overflow-y-auto max-h-[50vh]">
              <div className="grid gap-4">
                {myGroups.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>You haven't joined any groups yet.</p>
                    <p className="text-sm">Create a group or browse available groups to get started!</p>
                  </div>
                ) : (
                  myGroups.map((group) => (
                    <Card key={group.id} className="cursor-pointer hover:bg-accent transition-colors">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base">{group.name}</CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {group.topic}
                              </Badge>
                              <span className="flex items-center gap-1 text-xs">
                                <Calendar className="h-3 w-3" />
                                {new Date(group.created_at).toLocaleDateString()}
                              </span>
                            </CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => {
                                onGroupSelect(group.id);
                                onOpenChange(false);
                              }}
                              className="flex items-center gap-1"
                            >
                              <MessageCircle className="h-3 w-3" />
                              Chat
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => leaveGroup(group.id)}
                            >
                              Leave
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      {group.description && (
                        <CardContent className="pt-0">
                          <p className="text-sm text-muted-foreground">{group.description}</p>
                        </CardContent>
                      )}
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="all-groups" className="overflow-y-auto max-h-[50vh]">
              <div className="grid gap-4">
                {groups.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No groups available.</p>
                    <p className="text-sm">Be the first to create a study group!</p>
                  </div>
                ) : (
                  groups.map((group) => (
                    <Card key={group.id} className="hover:bg-accent transition-colors">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base">{group.name}</CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {group.topic}
                              </Badge>
                              <span className="flex items-center gap-1 text-xs">
                                <Users className="h-3 w-3" />
                                {group.member_count} members
                              </span>
                              <span className="flex items-center gap-1 text-xs">
                                <Calendar className="h-3 w-3" />
                                {new Date(group.created_at).toLocaleDateString()}
                              </span>
                            </CardDescription>
                          </div>
                          <div className="flex gap-2">
                            {group.is_member ? (
                              <>
                                <Button 
                                  size="sm" 
                                  onClick={() => {
                                    onGroupSelect(group.id);
                                    onOpenChange(false);
                                  }}
                                  className="flex items-center gap-1"
                                >
                                  <MessageCircle className="h-3 w-3" />
                                  Chat
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => leaveGroup(group.id)}
                                >
                                  Leave
                                </Button>
                              </>
                            ) : (
                              <Button 
                                size="sm" 
                                onClick={() => joinGroup(group.id)}
                              >
                                Join Group
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      {group.description && (
                        <CardContent className="pt-0">
                          <p className="text-sm text-muted-foreground">{group.description}</p>
                        </CardContent>
                      )}
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Create Group Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Group</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Group Name *</label>
              <Input
                value={newGroup.name}
                onChange={(e) => setNewGroup(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter group name"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Topic *</label>
              <Input
                value={newGroup.topic}
                onChange={(e) => setNewGroup(prev => ({ ...prev, topic: e.target.value }))}
                placeholder="e.g., Mathematics, Science, History"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={newGroup.description}
                onChange={(e) => setNewGroup(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the group"
                className="mt-1"
                rows={3}
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button 
                onClick={createGroup} 
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? "Creating..." : "Create Group"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsCreateDialogOpen(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};