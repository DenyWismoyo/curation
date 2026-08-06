"use client";

import { useState } from "react";
import { SceneCard } from "@/components/storyboard/SceneCard";
import { 
  generateAndSaveFullStoryboard,
  addScene, 
  updateScene, 
  generatePromptForScene, 
  Scene 
} from "@/services/storyboard/storyboard.service";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { auth } from "@/lib/firebase/firebase";

export default function StoryboardPage() {
  // Input untuk AI auto-generate
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [numScenes, setNumScenes] = useState<number>(5);
  const [durationPerScene, setDurationPerScene] = useState<number>(7);

  // State setelah digenerate
  const [coreStory, setCoreStory] = useState("");
  const [visualStyle, setVisualStyle] = useState("");
  const [storyboardId, setStoryboardId] = useState<string | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  
  const [isGeneratingFull, setIsGeneratingFull] = useState(false);
  const [generatingSceneId, setGeneratingSceneId] = useState<string | null>(null);

  const currentUser = auth.currentUser;

  const handleAutoGenerate = async () => {
    if (!currentUser) {
      toast.error("Silakan login terlebih dahulu.");
      return;
    }
    if (title.length < 3 || summary.length < 5) {
      toast.error("Judul dan ringkasan cerita harus diisi.");
      return;
    }

    setIsGeneratingFull(true);
    try {
      const result = await generateAndSaveFullStoryboard(
        currentUser.uid,
        title,
        summary,
        numScenes,
        durationPerScene
      );
      
      setStoryboardId(result.storyboard.id);
      setCoreStory(result.storyboard.coreStory);
      setVisualStyle(result.storyboard.visualStyle);
      setScenes(result.scenes);
      
      toast.success("Storyboard berhasil digenerate!");
    } catch (error: any) {
      toast.error("Gagal menggenerate storyboard: " + error.message);
    } finally {
      setIsGeneratingFull(false);
    }
  };

  const handleAddScene = async () => {
    if (!storyboardId) return;
    const nextNumber = scenes.length > 0 ? Math.max(...scenes.map(s => s.sceneNumber)) + 1 : 1;
    try {
      const newScene = await addScene(storyboardId, nextNumber, "");
      setScenes([...scenes, newScene]);
    } catch (error: any) {
      toast.error("Gagal menambah scene: " + error.message);
    }
  };

  const handleUpdateDescription = async (sceneId: string, desc: string, voiceover?: string) => {
    if (!storyboardId) return;
    setScenes(scenes.map(s => s.id === sceneId ? { ...s, description: desc, voiceoverText: voiceover || s.voiceoverText } : s));
    try {
      await updateScene(storyboardId, sceneId, { description: desc, voiceoverText: voiceover });
    } catch (error) {
      console.error("Gagal menyimpan deskripsi:", error);
    }
  };

  // Fitur manual generate prompt untuk 1 scene (regenerate)
  const handleGeneratePrompt = async (sceneId: string) => {
    if (!storyboardId) return;
    
    const sceneIndex = scenes.findIndex(s => s.id === sceneId);
    if (sceneIndex === -1) return;
    
    const targetScene = scenes[sceneIndex];
    let previousPrompt = null;
    
    if (sceneIndex > 0) {
      previousPrompt = scenes[sceneIndex - 1].generatedPrompt;
    }

    setGeneratingSceneId(sceneId);
    try {
      const prompt = await generatePromptForScene(
        coreStory,
        visualStyle,
        targetScene.description,
        previousPrompt
      );
      
      const updatedScene = { ...targetScene, generatedPrompt: prompt };
      setScenes(scenes.map(s => s.id === sceneId ? updatedScene : s));
      await updateScene(storyboardId, sceneId, { generatedPrompt: prompt });
      toast.success(`Prompt Scene ${targetScene.sceneNumber} berhasil diperbarui.`);
    } catch (error: any) {
      toast.error("Gagal menggenerate prompt: " + error.message);
    } finally {
      setGeneratingSceneId(null);
    }
  };

  const resetStoryboard = () => {
    if (confirm("Mulai ulang akan mengosongkan layar saat ini. Yakin?")) {
      setStoryboardId(null);
      setScenes([]);
      setCoreStory("");
      setVisualStyle("");
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-5xl px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">AI Video Storyboard Auto-Generator</h1>
        {storyboardId && (
          <Button variant="outline" onClick={resetStoryboard}>Mulai Baru</Button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Form & Configuration */}
        <div className="md:col-span-1 space-y-6">
          {!storyboardId ? (
            <div className="space-y-4 bg-muted/30 p-4 rounded-xl border">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Auto-Generate AI
              </h2>
              
              <div className="space-y-2">
                <Label htmlFor="title">Judul Video</Label>
                <Input 
                  id="title"
                  placeholder="Misal: Sejarah Roro Jonggrang"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="summary">Ringkasan Cerita</Label>
                <Textarea 
                  id="summary"
                  placeholder="Ceritakan secara singkat apa yang akan terjadi dari awal sampai akhir..."
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="min-h-[120px]"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numScenes">Jumlah Scene</Label>
                  <Input 
                    id="numScenes"
                    type="number"
                    min={1}
                    max={20}
                    value={numScenes}
                    onChange={(e) => setNumScenes(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Durasi (Detik)</Label>
                  <Input 
                    id="duration"
                    type="number"
                    min={1}
                    max={60}
                    value={durationPerScene}
                    onChange={(e) => setDurationPerScene(Number(e.target.value))}
                  />
                </div>
              </div>

              <Button onClick={handleAutoGenerate} disabled={isGeneratingFull} className="w-full mt-4">
                {isGeneratingFull && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Storyboard
              </Button>
            </div>
          ) : (
            <div className="space-y-4 bg-muted/20 p-4 rounded-xl border">
              <h2 className="font-semibold text-lg">Detail Storyboard</h2>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Core Story (AI Generated)</Label>
                <p className="text-sm font-medium">{coreStory}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider">Visual Style</Label>
                <p className="text-sm">{visualStyle}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Scenes */}
        <div className="md:col-span-2 space-y-4">
          {isGeneratingFull ? (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-xl p-8 text-center text-muted-foreground space-y-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p>AI sedang merancang {numScenes} scene storyboard dan prompt video.<br/>Mohon tunggu sebentar...</p>
            </div>
          ) : storyboardId ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Daftar Scene ({scenes.length})</h2>
                <Button onClick={handleAddScene} size="sm" variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah Scene
                </Button>
              </div>
              
              {scenes.map(scene => (
                <SceneCard
                  key={scene.id}
                  scene={scene}
                  onUpdateDescription={handleUpdateDescription}
                  onGeneratePrompt={handleGeneratePrompt}
                  isGenerating={generatingSceneId === scene.id}
                />
              ))}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] border-2 border-dashed rounded-xl p-8 text-center text-muted-foreground">
              <Sparkles className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
              <p>Isi formulir di sebelah kiri dan biarkan AI merancang seluruh storyboard untuk Anda.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
