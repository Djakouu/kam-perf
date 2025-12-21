import React, { useState } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Dot
} from 'recharts';
import { MessageSquare, ChevronDown, ChevronUp, Edit2 } from 'lucide-react';
import { LoadingSpinner } from '../ui/Loading';
import { CommentModal } from './CommentModal';
import { ADD_COMMENT, DELETE_COMMENT } from '../../graphql/mutations';

const GET_HISTORY = gql`
  query GetHistory($entityId: ID!, $entityType: EntityType!, $tool: ToolType!, $dateRange: DateRangeInput) {
    getHistory(entityId: $entityId, entityType: $entityType, tool: $tool, dateRange: $dateRange) {
      date
      desktopCpuAvg
      mobileCpuAvg
      comment {
        id
        text
      }
    }
  }
`;

interface GraphPanelProps {
  entityId: string;
  entityType: 'ACCOUNT' | 'DOMAIN' | 'PAGE';
  tool?: 'KAMELEOON' | 'AB_TASTY';
  filters?: any;
}

export function GraphPanel({ entityId, entityType, tool = 'KAMELEOON', filters }: GraphPanelProps) {
  const [selectedPoint, setSelectedPoint] = useState<any>(null);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [showCommentsList, setShowCommentsList] = useState(false);

  const dateRange = React.useMemo(() => {
    if (filters?.startDate && filters?.endDate) {
      return {
        start: filters.startDate,
        end: filters.endDate
      };
    }
    return undefined;
  }, [filters?.startDate, filters?.endDate]);

  const { loading, error, data, refetch } = useQuery(GET_HISTORY, {
    variables: { entityId, entityType, tool, dateRange },
    fetchPolicy: 'network-only'
  });

  const [addComment] = useMutation(ADD_COMMENT, {
    onCompleted: () => refetch()
  });

  const [deleteComment] = useMutation(DELETE_COMMENT, {
    onCompleted: () => refetch()
  });

  const handlePointClick = (data: any) => {
    setSelectedPoint(data);
    setIsCommentModalOpen(true);
  };

  const handleSaveComment = (text: string) => {
    if (!selectedPoint) return;
    
    const existingCommentId = selectedPoint.payload.comment?.id;
    
    const save = () => {
      addComment({
        variables: {
          input: {
            entityId,
            entityType,
            date: selectedPoint.payload.rawDate,
            text
          }
        }
      });
    };

    if (existingCommentId) {
      deleteComment({ variables: { id: existingCommentId } }).then(save);
    } else {
      save();
    }
  };

  const handleDeleteComment = () => {
    if (selectedPoint?.payload.comment?.id) {
      deleteComment({
        variables: {
          id: selectedPoint.payload.comment.id
        }
      });
    }
  };

  if (loading) return <div className="h-80 bg-white p-6 rounded-lg border border-neutral-200 shadow-soft mt-4 mb-4 flex items-center justify-center"><LoadingSpinner /></div>;
  if (error) return <div className="h-64 flex items-center justify-center text-status-danger">Error loading history</div>;
  if (!data?.getHistory?.length) {
    const dateMessage = filters?.startDate && filters?.endDate 
      ? `from ${new Date(filters.startDate).toLocaleDateString()} to ${new Date(filters.endDate).toLocaleDateString()}`
      : 'for the selected period';
      
    return (
      <div className="h-64 flex flex-col items-center justify-center text-neutral-400 gap-2">
        <p>No history data available {dateMessage}</p>
        <p className="text-sm text-neutral-500">Try selecting a different date range</p>
      </div>
    );
  }

  const chartData = data.getHistory.map((item: any) => ({
    ...item,
    rawDate: item.date,
    date: new Date(item.date).toLocaleDateString(),
  }));

  const comments = chartData.filter((d: any) => d.comment);

  // Custom Dot to show comment indicator
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    const hasComment = !!payload.comment;
    
    if (!hasComment) {
        return <Dot {...props} r={3} style={{ pointerEvents: 'none' }} />;
    }

    return (
      <g transform={`translate(${cx},${cy})`} style={{ pointerEvents: 'none' }}>
        <circle r={6} fill="#3b82f6" stroke="white" strokeWidth={2} />
        <circle r={2} fill="white" />
      </g>
    );
  };

  // Custom XAxis Tick
  const CustomXAxisTick = (props: any) => {
    const { x, y, payload } = props;
    const point = chartData.find((d: any) => d.date === payload.value);
    const hasComment = !!point?.comment;

    return (
      <g transform={`translate(${x},${y})`} style={{ cursor: 'pointer' }} onClick={() => {
        if (point) handlePointClick({ payload: point });
      }}>
        <text x={0} y={0} dy={24} textAnchor="middle" fill="#666" fontSize={12}>
          {payload.value}
        </text>
        {hasComment ? (
          <g transform="translate(-7, 0)">
             <MessageSquare size={14} fill="#2C5D52" stroke="#2C5D52" />
          </g>
        ) : (
          <g transform="translate(-7, 0)">
             <MessageSquare size={14} stroke="#2C5D52" fill="transparent" strokeWidth={1.5} />
          </g>
        )}
      </g>
    );
  };

  return (
    <div className="h-fit w-full bg-white p-6 rounded-lg border border-neutral-200 shadow-soft mt-4 mb-4 relative">
      <h3 className="text-sm font-medium text-neutral-700 mb-6">CPU Time Evolution</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis 
              dataKey="date" 
              stroke="#9ca3af" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false} 
              dy={10}
              tick={<CustomXAxisTick />}
              interval="preserveStartEnd"
            />
            <YAxis 
              stroke="#9ca3af" 
              fontSize={12} 
              tickLine={false} 
              axisLine={false}
              tickFormatter={(value) => `${value}ms`}
              dx={-10}
            />
            <Tooltip 
              position={{ y: 0 }}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-3 border border-neutral-200 rounded-lg shadow-lg z-50 min-w-[200px]">
                      <p className="text-sm font-medium mb-2 text-neutral-900 border-b border-neutral-100 pb-1">{label}</p>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[#3b82f6] font-medium">Desktop:</span>
                          <span className="text-sm text-[#3b82f6] font-bold">{data.desktopCpuAvg}ms</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[#8b5cf6] font-medium">Mobile:</span>
                          <span className="text-sm text-[#8b5cf6] font-bold">{data.mobileCpuAvg}ms</span>
                        </div>
                      </div>
                      {data.comment && (
                        <div className="mt-3 pt-2 border-t border-neutral-100 bg-neutral-50 -mx-3 px-3 pb-1">
                          <p className="text-xs text-neutral-500 italic">"{data.comment.text}"</p>
                        </div>
                      )}
                      <div className="mt-3 pt-2 border-t border-neutral-100 text-center">
                        <p className="text-[10px] uppercase tracking-wide font-semibold text-neutral-400">
                          {data.comment ? 'Click date to edit comment' : 'Click date to add comment'}
                        </p>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <ReferenceLine y={500} stroke="#10B981" strokeDasharray="3 3" />
            <ReferenceLine y={1000} stroke="#F59E0B" strokeDasharray="3 3" />
            <ReferenceLine y={2000} stroke="#EF4444" strokeDasharray="3 3" />
            
            <Line 
              type="monotone" 
              dataKey="desktopCpuAvg" 
              name="Desktop"
              stroke="#3b82f6" 
              strokeWidth={2} 
              dot={<CustomDot />}
              activeDot={{ r: 6, style: { pointerEvents: 'none' } }}
              isAnimationActive={false}
            />
            <Line 
              type="monotone" 
              dataKey="mobileCpuAvg" 
              name="Mobile"
              stroke="#8b5cf6" 
              strokeWidth={2} 
              dot={{ r: 3, fill: '#8b5cf6', style: { pointerEvents: 'none' } }} 
              activeDot={{ r: 5, style: { pointerEvents: 'none' } }} 
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Comments List Toggle */}
      {comments.length > 0 && (
        <div className="mt-4 border-t border-neutral-100 pt-4">
          <button 
            onClick={() => setShowCommentsList(!showCommentsList)}
            className="flex items-center gap-2 text-xs text-neutral-500 hover:text-neutral-700 font-medium transition-colors"
          >
            {showCommentsList ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {showCommentsList ? 'Hide Comments' : `Show ${comments.length} Comments`}
          </button>
          
          {showCommentsList && (
            <div className="mt-3 space-y-2">
              {comments.map((item: any) => (
                <div key={item.comment.id} className="flex items-start gap-3 p-3 bg-neutral-50 rounded-lg border border-neutral-100 hover:border-neutral-200 transition-colors">
                  <div className="mt-0.5 text-primary-500">
                    <MessageSquare size={14} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-neutral-600">{item.date}</span>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handlePointClick({ payload: item })}
                          className="text-neutral-400 hover:text-primary-600 transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={12} />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-neutral-700">{item.comment.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedPoint && (
        <CommentModal
          isOpen={isCommentModalOpen}
          onClose={() => setIsCommentModalOpen(false)}
          onSave={handleSaveComment}
          onDelete={handleDeleteComment}
          initialText={selectedPoint.payload.comment?.text}
          date={new Date(selectedPoint.payload.rawDate)}
        />
      )}
    </div>
  );
}
