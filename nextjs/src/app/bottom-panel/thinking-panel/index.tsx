import React from 'react';
import { BottomPanel } from '../bottom-panel';
import { PanelBody } from '../panel-body';
import { Thought } from './thought';

interface ThoughtOrActionMessage {
  id: string;
  type: 'thought' | 'action';
  content: string;
  action?: string;
  details?: string;
  status?: 'pending' | 'running' | 'completed' | 'error';
  timestamp: string;
  step?: number;
}

interface ThinkingPanelProps {
  messages: ThoughtOrActionMessage[];
  isFloating?: boolean;
}

export function ThinkingPanel({ messages, isFloating = false }: ThinkingPanelProps) {
  const messagesTopRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to top when new messages arrive
  React.useEffect(() => {
    messagesTopRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Filter for thought messages and get only the latest
  const thoughtMessages = messages.filter(msg => msg.type === 'thought');
  const currentStepThoughts = thoughtMessages.slice(-1); // Show only the latest thought

  const content = (
    <PanelBody>
      {currentStepThoughts.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-500 text-sm italic">
          Agent thoughts will appear here...
        </div>
      ) : (
        <div className="space-y-4 p-2">
          <div ref={messagesTopRef} />
          {currentStepThoughts.map((message) => (
            <Thought
              key={message.id}
              content={message.content}
              timestamp={message.timestamp}
            />
          ))}
        </div>
      )}
    </PanelBody>
  );

  if (isFloating) {
    return content;
  }

  return (
    <BottomPanel title="Thoughts">
      {content}
    </BottomPanel>
  );
}