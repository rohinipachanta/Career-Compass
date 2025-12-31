import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type InsertAchievement } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useAchievements() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const achievementsQuery = useQuery({
    queryKey: [api.achievements.list.path],
    queryFn: async () => {
      const res = await fetch(api.achievements.list.path);
      if (!res.ok) throw new Error("Failed to fetch achievements");
      return api.achievements.list.responses[200].parse(await res.json());
    },
  });

  const createAchievementMutation = useMutation({
    mutationFn: async (data: InsertAchievement) => {
      const res = await fetch(api.achievements.create.path, {
        method: api.achievements.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to create achievement");
      return api.achievements.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.achievements.list.path] });
      toast({
        title: "Success!",
        description: "Achievement added to your list.",
      });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  return {
    achievements: achievementsQuery.data,
    isLoading: achievementsQuery.isLoading,
    error: achievementsQuery.error,
    createAchievement: createAchievementMutation,
  };
}
