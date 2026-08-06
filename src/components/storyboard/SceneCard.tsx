"use client";

import { useState } from "react";
import { Scene } from "@/services/storyboard/storyboard.service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, Check } from "lucide-react";

interface SceneCardProps {
  scene: Scene;
  onUpdateDescription: (id: string, newDesc: string, newVoiceover?: string) => void;
  onGeneratePrompt: (id: string) => void;
  isGenerating: boolean;
}

export function SceneCard({ scene, onUpdateDescription, onGeneratePrompt, isGenerating }: SceneCardProps) {
  const [desc, setDesc] = useState(scene.description);
  const [voiceover, setVoiceover] = useState(scene.voiceoverText || "");
  const [copied, setCopied] = useState(false);

  const handleBlur = () => {
    if (desc !== scene.description || voiceover !== (scene.voiceoverText || "")) {
      onUpdateDescription(scene.id, desc, voiceover);
    }
  };

  const handleCopy = () => {
    if (scene.generatedPrompt) {
      navigator.clipboard.writeText(scene.generatedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-lg">Scene {scene.sceneNumber}</CardTitle>
        <CardDescription>Jelaskan aksi, karakter, dan lingkungan pada scene ini.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground">Deskripsi Aksi:</h4>
          <Textarea
            placeholder="Misal: Kamera bergerak lambat mendekati ksatria yang sedang menatap pedang bercahaya di dalam gua gelap..."
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            onBlur={handleBlur}
            className="min-h-[80px]"
          />
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground">Voiceover (Bahasa Indonesia):</h4>
          <Textarea
            placeholder="Misal: Di ujung kegelapan, secercah harapan mulai berpijar..."
            value={voiceover}
            onChange={(e) => setVoiceover(e.target.value)}
            onBlur={handleBlur}
            className="min-h-[60px]"
          />
        </div>

        <Button 
          onClick={() => onGeneratePrompt(scene.id)} 
          disabled={!desc.trim() || isGenerating}
          variant="secondary"
          className="w-full sm:w-auto"
        >
          {isGenerating ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Generate AI Prompt
        </Button>

        {scene.generatedPrompt && (
          <div className="mt-4 p-4 bg-muted rounded-md relative group">
            <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Generated Video Prompt:</h4>
            <p className="text-sm whitespace-pre-wrap pr-8">{scene.generatedPrompt}</p>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleCopy}
              title="Copy to clipboard"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
