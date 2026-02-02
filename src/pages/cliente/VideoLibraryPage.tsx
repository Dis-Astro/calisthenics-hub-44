import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Play, 
  Search,
  Dumbbell,
  Loader2,
  Clock,
  ExternalLink
} from "lucide-react";
import ClientLayout from "@/components/coaching/ClientLayout";

interface ExerciseVideo {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  exercise: {
    name: string;
    muscle_group: string | null;
  };
}

const VideoLibraryPage = () => {
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<ExerciseVideo[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMuscle, setSelectedMuscle] = useState<string | null>(null);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    setLoading(true);
    
    const { data } = await supabase
      .from("exercise_videos")
      .select(`
        id,
        title,
        video_url,
        thumbnail_url,
        duration_seconds,
        exercises (
          name,
          muscle_group
        )
      `)
      .order("created_at", { ascending: false });

    if (data) {
      setVideos(data.map(v => ({
        ...v,
        exercise: v.exercises as unknown as { name: string; muscle_group: string | null }
      })));
    }

    setLoading(false);
  };

  const muscleGroups = [...new Set(videos.map(v => v.exercise?.muscle_group).filter(Boolean))];

  const filteredVideos = videos.filter(v => {
    const matchesSearch = v.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.exercise?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMuscle = !selectedMuscle || v.exercise?.muscle_group === selectedMuscle;
    return matchesSearch && matchesMuscle;
  });

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <ClientLayout title="VIDEO ESERCIZI">
      <div className="space-y-6">
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cerca esercizio o video..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge 
              variant={selectedMuscle === null ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedMuscle(null)}
            >
              Tutti
            </Badge>
            {muscleGroups.map(muscle => (
              <Badge 
                key={muscle}
                variant={selectedMuscle === muscle ? "default" : "outline"}
                className="cursor-pointer capitalize"
                onClick={() => setSelectedMuscle(muscle === selectedMuscle ? null : muscle)}
              >
                {muscle}
              </Badge>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredVideos.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Play className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">
                {searchTerm || selectedMuscle ? "Nessun video trovato" : "Nessun video disponibile"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVideos.map(video => (
              <Card key={video.id} className="overflow-hidden hover:border-primary/50 transition-colors group">
                <a 
                  href={video.video_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block"
                >
                  <div className="aspect-video bg-muted relative">
                    {video.thumbnail_url ? (
                      <img 
                        src={video.thumbnail_url} 
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Dumbbell className="w-12 h-12 text-muted-foreground/50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                        <Play className="w-6 h-6 text-primary-foreground fill-primary-foreground" />
                      </div>
                    </div>
                    {video.duration_seconds && (
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(video.duration_seconds)}
                      </div>
                    )}
                  </div>
                </a>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    {video.title}
                    <ExternalLink className="w-3 h-3 text-muted-foreground" />
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Dumbbell className="w-3 h-3" />
                    {video.exercise?.name}
                    {video.exercise?.muscle_group && (
                      <Badge variant="secondary" className="text-xs capitalize">
                        {video.exercise.muscle_group}
                      </Badge>
                    )}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ClientLayout>
  );
};

export default VideoLibraryPage;
