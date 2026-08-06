import { db, functions } from '@/lib/firebase/firebase';
import { httpsCallable } from 'firebase/functions';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  orderBy, 
  serverTimestamp,
  updateDoc,
  writeBatch
} from 'firebase/firestore';

export interface Storyboard {
  id: string;
  userId: string;
  coreStory: string;
  visualStyle: string;
  createdAt: any;
  updatedAt: any;
}

export interface Scene {
  id: string;
  storyboardId: string;
  sceneNumber: number;
  description: string;
  generatedPrompt: string | null;
  voiceoverText: string | null;
  createdAt: any;
  updatedAt: any;
}

const generateScenePromptCallable = httpsCallable(functions, 'generateScenePrompt');

export const createStoryboard = async (userId: string, data: { coreStory: string, visualStyle: string }) => {
  const newStoryboardRef = doc(collection(db, 'storyboards'));
  const storyboard: Storyboard = {
    id: newStoryboardRef.id,
    userId,
    coreStory: data.coreStory,
    visualStyle: data.visualStyle,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  
  await setDoc(newStoryboardRef, storyboard);
  return storyboard;
};

export const getStoryboard = async (id: string) => {
  const docRef = doc(db, 'storyboards', id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as Storyboard;
  }
  return null;
};

export const updateStoryboard = async (id: string, data: Partial<Storyboard>) => {
  const docRef = doc(db, 'storyboards', id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const getScenes = async (storyboardId: string) => {
  const scenesRef = collection(db, `storyboards/${storyboardId}/scenes`);
  const q = query(scenesRef, orderBy('sceneNumber', 'asc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => doc.data() as Scene);
};

export const addScene = async (storyboardId: string, sceneNumber: number, description: string) => {
  const newSceneRef = doc(collection(db, `storyboards/${storyboardId}/scenes`));
  const scene: Scene = {
    id: newSceneRef.id,
    storyboardId,
    sceneNumber,
    description,
    generatedPrompt: null,
    voiceoverText: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  
  await setDoc(newSceneRef, scene);
  return scene;
};

export const updateScene = async (storyboardId: string, sceneId: string, data: Partial<Scene>) => {
  const docRef = doc(db, `storyboards/${storyboardId}/scenes`, sceneId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const generatePromptForScene = async (
  coreStory: string, 
  visualStyle: string, 
  sceneDescription: string, 
  previousPrompt: string | null
) => {
  try {
    const result = await generateScenePromptCallable({
      coreStory,
      visualStyle,
      sceneDescription,
      previousPrompt,
    });
    return (result.data as any).prompt as string;
  } catch (error) {
    console.error("Error generating prompt via function:", error);
    throw error;
  }
};

const generateFullStoryboardCallable = httpsCallable(functions, 'generateFullStoryboard');

export const generateAndSaveFullStoryboard = async (
  userId: string,
  title: string,
  summary: string,
  numScenes: number,
  durationPerScene: number
) => {
  try {
    const result = await generateFullStoryboardCallable({
      title,
      summary,
      numScenes,
      durationPerScene,
    });
    
    const payload = (result.data as any).data;
    
    // Create batch
    const batch = writeBatch(db);
    
    // Storyboard Doc
    const newStoryboardRef = doc(collection(db, 'storyboards'));
    const storyboard: Storyboard = {
      id: newStoryboardRef.id,
      userId,
      coreStory: payload.coreStory || title,
      visualStyle: payload.visualStyle || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    batch.set(newStoryboardRef, storyboard);
    
    // Scene Docs
    const scenes: Scene[] = [];
    if (payload.scenes && Array.isArray(payload.scenes)) {
      payload.scenes.forEach((s: any, idx: number) => {
        const sceneRef = doc(collection(db, `storyboards/${newStoryboardRef.id}/scenes`));
        const sceneData: Scene = {
          id: sceneRef.id,
          storyboardId: newStoryboardRef.id,
          sceneNumber: s.sceneNumber || idx + 1,
          description: s.description || '',
          generatedPrompt: s.prompt || null,
          voiceoverText: s.voiceoverText || null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        batch.set(sceneRef, sceneData);
        scenes.push(sceneData);
      });
    }
    
    await batch.commit();
    
    return { storyboard, scenes };
  } catch (error) {
    console.error("Error generating full storyboard via function:", error);
    throw error;
  }
};
