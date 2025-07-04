import React from 'react';
import { BottomPanel } from '../bottom-panel';
import { PanelBody } from '../panel-body';
import { Action } from './action';

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

interface ActionPanelProps {
  messages: ThoughtOrActionMessage[];
  isFloating?: boolean;
}

export function ActionPanel({ messages, isFloating = false }: ActionPanelProps) {
  const messagesTopRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to top when new messages arrive
  React.useEffect(() => {
    messagesTopRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Filter for action messages and get only the latest
  const actionMessages = messages.filter(msg => msg.type === 'action');
  const currentStepActions = actionMessages.slice(-1); // Show only the latest action

  const content = (
    <PanelBody>
      {currentStepActions.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-500 text-sm">
          Agent actions will appear here...
        </div>
      ) : (
        <div className="space-y-3">
          <div ref={messagesTopRef} />
          {currentStepActions.map((message) => (
            <Action
              key={message.id}
              action={message.action || 'Action'}
              details={message.details}
              status={message.status}
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
    <BottomPanel title="Actions">
      {content}
    </BottomPanel>
  );
}