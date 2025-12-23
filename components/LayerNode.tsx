import React, { memo } from 'react';
import { NodeProps } from 'reactflow';

const LayerNode = ({ data }: NodeProps) => {
  return (
    <div className="w-full h-full border-t-2 border-dashed border-white/5 relative group">
      <div className="absolute top-0 left-0 px-4 py-2 bg-[#0A0A0B]/50 rounded-br-2xl border-b border-r border-white/5 backdrop-blur-sm shadow-xl">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] group-hover:text-[#06B6D4] transition-colors">
          {data.label}
        </span>
      </div>
      <div className="w-full h-full bg-gradient-to-b from-white/[0.01] to-transparent pointer-events-none" />
    </div>
  );
};

export default memo(LayerNode);
