import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, MicOff, Square, Play, Pause } from "lucide-react";

interface VoiceModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function VoiceModal({ isOpen = false, onClose }: VoiceModalProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const playAudio = () => {
    if (audioBlob) {
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.play();
      setIsPlaying(true);
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleClose = () => {
    if (isRecording) {
      stopRecording();
    }
    if (isPlaying) {
      pauseAudio();
    }
    setTranscript("");
    setAudioBlob(null);
    onClose?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Voice Assistant</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center space-y-4">
                <div className="flex space-x-2">
                  {!isRecording ? (
                    <Button
                      onClick={startRecording}
                      className="bg-red-500 hover:bg-red-600 text-white rounded-full p-3"
                    >
                      <Mic className="h-6 w-6" />
                    </Button>
                  ) : (
                    <Button
                      onClick={stopRecording}
                      className="bg-gray-500 hover:bg-gray-600 text-white rounded-full p-3"
                    >
                      <Square className="h-6 w-6" />
                    </Button>
                  )}

                  {audioBlob && !isRecording && (
                    <Button
                      onClick={isPlaying ? pauseAudio : playAudio}
                      variant="outline"
                      className="rounded-full p-3"
                    >
                      {isPlaying ? (
                        <Pause className="h-6 w-6" />
                      ) : (
                        <Play className="h-6 w-6" />
                      )}
                    </Button>
                  )}
                </div>

                <div className="text-center">
                  {isRecording ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span className="text-sm text-muted-foreground">Recording...</span>
                    </div>
                  ) : audioBlob ? (
                    <span className="text-sm text-muted-foreground">Recording ready</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Click to start recording</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {transcript && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Transcript:</h4>
                  <p className="text-sm text-muted-foreground">{transcript}</p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
            {audioBlob && (
              <Button onClick={() => setTranscript("Voice processing complete")}>
                Process
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}