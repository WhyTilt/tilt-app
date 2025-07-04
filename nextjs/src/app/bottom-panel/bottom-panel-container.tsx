import React from 'react';

interface BottomPanelContainerProps {
  children: React.ReactNode;
  tasksMode?: boolean;
}

export function BottomPanelContainer({ children, tasksMode = false }: BottomPanelContainerProps) {
  const childrenArray = React.Children.toArray(children);
  
  if (tasksMode && childrenArray.length === 2) {
    // Tasks mode: Force 2/3 and 1/3 widths
    return (
      <div className="flex w-full h-full gap-[6px]">
        <div style={{ width: '66.666%', minWidth: 0 }}>
          {childrenArray[0]}
        </div>
        <div style={{ width: '33.333%', minWidth: 0 }}>
          {childrenArray[1]}
        </div>
      </div>
    );
  }
  
  // Normal mode: Equal width
  return (
    <div className="flex w-full h-full gap-[6px]">
      {childrenArray.map((child, index) => (
        <div key={index} className="flex-1" style={{ minWidth: 0 }}>
          {child}
        </div>
      ))}
    </div>
  );
}