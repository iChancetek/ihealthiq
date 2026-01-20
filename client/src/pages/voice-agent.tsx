import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Volume2, VolumeX, Settings, Activity, MessageCircle } from "lucide-react";
import { useVoice } from "@/hooks/use-voice";
import { voiceApi } from "@/lib/api";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";

export default function VoiceAgent() {
  const [autoListen, setAutoListen] = useState(false);
  const [voiceVolume, setVoiceVolume] = useState([80]);
  const [speechRate, setSpeechRate] = useState([1]);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);

  const {
    isVoiceActive,
    isListening,
    currentTranscript,
    lastResponse,
    isConnected,
    startListening,
    stopListening,
    openVoiceModal
  } = useVoice();

  const { data: voiceSessions } = useQuery({
    queryKey: ['/api/voice/sessions'],
    queryFn: voiceApi.getSessions,
  });

  useEffect(() => {
    if (currentTranscript && lastResponse) {
      setConversationHistory(prev => [
        ...prev,
        {
          id: Date.now(),
          type: 'user',
          content: currentTranscript,
          timestamp: new Date()
        },
        {
          id: Date.now() + 1,
          type: 'assistant',
          content: lastResponse,
          timestamp: new Date()
        }
      ]);
    }
  }, [currentTranscript, lastResponse]);

  const handleVolumeChange = (value: number[]) => {
    setVoiceVolume(value);
    if ('speechSynthesis' in window) {
      // This would affect future speech synthesis calls
    }
  };

  const handleSpeechRateChange = (value: number[]) => {
    setSpeechRate(value);
  };

  const clearHistory = () => {
    setConversationHistory([]);
  };

  const quickPrompts = [
    "What's the status of pending referrals?",
    "How many patients need eligibility verification?",
    "Show me today's appointments",
    "What tasks are high priority?",
    "Are there any SOC alerts?",
    "Generate a patient summary report"
  ];

  const handleQuickPrompt = (prompt: string) => {
    // This would simulate voice input
    setConversationHistory(prev => [
      ...prev,
      {
        id: Date.now(),
        type: 'user',
        content: prompt,
        timestamp: new Date()
      },
      {
        id: Date.now() + 1,
        type: 'assistant',
        content: `I understand you're asking about: "${prompt}". Let me help you with that information from the healthcare platform.`,
        timestamp: new Date()
      }
    ]);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Connection Status */}
      <Card className={`border-2 ${isConnected ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className={`w-5 h-5 ${isConnected ? 'text-green-600' : 'text-red-600'}`} />
            <span className={isConnected ? 'text-green-900' : 'text-red-900'}>
              Voice AI Connection Status
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className={`${isConnected ? 'text-green-800' : 'text-red-800'}`}>
                {isConnected ? 'Connected and ready' : 'Disconnected - check your connection'}
              </p>
              <p className={`text-xs mt-1 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                {isConnected 
                  ? 'Voice AI is ready to assist with healthcare workflows'
                  : 'Unable to connect to voice services'
                }
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <Badge
                className={isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                variant="secondary"
              >
                {isConnected ? 'Online' : 'Offline'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Voice Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Mic className="w-5 h-5" />
              <span>Voice Controls</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Main Voice Button */}
            <div className="text-center">
              <Button
                size="lg"
                onClick={openVoiceModal}
                disabled={!isConnected}
                className={`w-32 h-32 rounded-full ${
                  isVoiceActive 
                    ? 'bg-red-500 hover:bg-red-600' 
                    : 'bg-teal-600 hover:bg-teal-700'
                }`}
              >
                {isVoiceActive ? (
                  <MicOff className="w-12 h-12" />
                ) : (
                  <Mic className="w-12 h-12" />
                )}
              </Button>
              <p className="mt-4 text-sm text-gray-600">
                {isVoiceActive ? 'Voice AI Active' : 'Click to activate Voice AI'}
              </p>
            </div>

            {/* Voice Settings */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Auto-listen mode</label>
                <Switch
                  checked={autoListen}
                  onCheckedChange={setAutoListen}
                  disabled={!isConnected}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Voice Volume</label>
                  <span className="text-sm text-gray-500">{voiceVolume[0]}%</span>
                </div>
                <Slider
                  value={voiceVolume}
                  onValueChange={handleVolumeChange}
                  max={100}
                  step={1}
                  disabled={!isConnected}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Speech Rate</label>
                  <span className="text-sm text-gray-500">{speechRate[0]}x</span>
                </div>
                <Slider
                  value={speechRate}
                  onValueChange={handleSpeechRateChange}
                  min={0.5}
                  max={2}
                  step={0.1}
                  disabled={!isConnected}
                />
              </div>
            </div>

            {/* Current Status */}
            {isVoiceActive && (
              <div className="p-4 bg-teal-50 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium text-teal-800">
                    {isListening ? 'Listening...' : 'Ready to listen'}
                  </span>
                </div>
                {currentTranscript && (
                  <p className="text-sm text-teal-700">
                    Last heard: "{currentTranscript}"
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageCircle className="w-5 h-5" />
              <span>Quick Voice Prompts</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {quickPrompts.map((prompt, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="w-full text-left justify-start"
                  onClick={() => handleQuickPrompt(prompt)}
                  disabled={!isConnected}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  {prompt}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversation History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="w-5 h-5" />
            <span>Conversation History</span>
          </CardTitle>
          <Button variant="outline" size="sm" onClick={clearHistory}>
            Clear History
          </Button>
        </CardHeader>
        <CardContent>
          {conversationHistory.length > 0 ? (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {conversationHistory.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.type === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Conversations Yet</h3>
              <p className="text-gray-500">Start a conversation with the Voice AI to see the history here.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Sessions */}
      {voiceSessions && voiceSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="w-5 h-5" />
              <span>Active Voice Sessions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {voiceSessions.map((session: any) => (
                <div key={session.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <div>
                      <p className="font-medium text-gray-900">Session {session.sessionId}</p>
                      <p className="text-sm text-gray-600">
                        Started: {new Date(session.startedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-800" variant="secondary">
                    Active
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
