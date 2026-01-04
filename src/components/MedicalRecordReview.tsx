'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Tabs, Textarea, type TabItem } from './ui';
import { Sparkles, Save, Lightbulb, BookOpen, ChevronRight, AlertCircle } from 'lucide-react';
import ICD10Picker from './ICD10Picker';

// Helper: Parse markdown table to structured data
interface TableData {
    headers: string[];
    rows: string[][];
}

function parseMarkdownTable(text: string): { beforeTable: string; table: TableData | null; afterTable: string } {
    const lines = text.split('\n');
    let tableStartIndex = -1;
    let tableEndIndex = -1;

    // Find table boundaries
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('|') && line.endsWith('|')) {
            if (tableStartIndex === -1) tableStartIndex = i;
            tableEndIndex = i;
        } else if (tableStartIndex !== -1 && tableEndIndex !== -1 && line !== '') {
            break;
        }
    }

    if (tableStartIndex === -1) {
        return { beforeTable: text, table: null, afterTable: '' };
    }

    const beforeTable = lines.slice(0, tableStartIndex).join('\n').trim();
    const afterTable = lines.slice(tableEndIndex + 1).join('\n').trim();
    const tableLines = lines.slice(tableStartIndex, tableEndIndex + 1);

    // Parse headers
    const headerLine = tableLines[0];
    const headers = headerLine
        .split('|')
        .filter(cell => cell.trim() !== '')
        .map(cell => cell.trim());

    // Parse rows (skip separator line)
    const rows: string[][] = [];
    for (let i = 2; i < tableLines.length; i++) {
        const cells = tableLines[i]
            .split('|')
            .filter(cell => cell.trim() !== '')
            .map(cell => cell.trim());
        if (cells.length > 0) {
            rows.push(cells);
        }
    }

    return { beforeTable, table: { headers, rows }, afterTable };
}

// AI Advice Display Component
function AIAdviceDisplay({ advice }: { advice: string }) {
    const { beforeTable, table, afterTable } = parseMarkdownTable(advice);

    return (
        <div className="rounded-xl overflow-hidden shadow-lg border border-sky-100 animate-fade-in">
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-500 px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                        <Lightbulb className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h4 className="text-lg font-bold text-white">
                            Gợi ý từ Medical Assistant
                        </h4>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="bg-gradient-to-b from-sky-50 to-white p-5 space-y-4">
                {/* Before table content */}
                {beforeTable && (
                    <div className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {beforeTable.split('\n').map((line, i) => {
                            // Highlight bold text
                            if (line.includes('**')) {
                                const parts = line.split(/\*\*(.*?)\*\*/g);
                                return (
                                    <p key={i} className="mb-2">
                                        {parts.map((part, j) =>
                                            j % 2 === 1
                                                ? <span key={j} className="font-semibold text-sky-700">{part}</span>
                                                : part
                                        )}
                                    </p>
                                );
                            }
                            return <p key={i} className="mb-2">{line}</p>;
                        })}
                    </div>
                )}

                {/* Styled Table - Redesigned as Cards for better readability */}
                {table && (
                    <div className="space-y-3">
                        {table.rows.map((row, rowIndex) => {
                            // Determine structure: some tables have [number, content], others have [title, content]
                            let cardNumber = rowIndex + 1;
                            let cardTitle = '';
                            let cardContent = '';
                            let reference = '';

                            if (row.length >= 2) {
                                const firstCol = (row[0] || '').trim();
                                const secondCol = (row[1] || '').trim();
                                reference = row[2] || '';

                                // Check if first column is just a number
                                const isFirstColNumber = /^\d+\.?$/.test(firstCol.replace(/\*\*/g, ''));

                                if (isFirstColNumber) {
                                    // Structure: [number, content with title]
                                    cardNumber = parseInt(firstCol.replace(/\D/g, '')) || rowIndex + 1;

                                    // Extract title from content (usually first line or bold text)
                                    const lines = secondCol.split(/[\n<br>]/);
                                    const firstLine = lines[0]?.trim() || '';

                                    // If first line looks like a title (short, possibly bold)
                                    if (firstLine.length < 100 && !firstLine.includes('.')) {
                                        cardTitle = firstLine.replace(/\*\*/g, '').trim();
                                        cardContent = lines.slice(1).join('\n').trim();
                                    } else {
                                        // Try to extract title from bold text at start
                                        const boldMatch = secondCol.match(/^\*\*(.*?)\*\*/);
                                        if (boldMatch) {
                                            cardTitle = boldMatch[1].trim();
                                            cardContent = secondCol.replace(/^\*\*(.*?)\*\*/, '').trim();
                                        } else {
                                            cardTitle = `Mục ${cardNumber}`;
                                            cardContent = secondCol;
                                        }
                                    }
                                } else {
                                    // Structure: [title, content]
                                    cardTitle = firstCol
                                        .replace(/\*\*/g, '')
                                        .replace(/^\s*\d+\.\s*/, '')
                                        .trim();
                                    cardContent = secondCol;
                                }
                            } else if (row.length === 1) {
                                // Single column - treat as content
                                cardContent = row[0] || '';
                                cardTitle = `Mục ${cardNumber}`;
                            }

                            // Parse content with markdown formatting
                            const parseContent = (text: string) => {
                                if (!text) return null;

                                // Replace <br> tags with newlines
                                let normalizedText = text.replace(/<br\s*\/?>/gi, '\n');

                                // Split on dash items like "- item 1. - item 2."
                                normalizedText = normalizedText.replace(/\.\s*-\s*/g, '.\n- ');

                                // Split numbered items like "1. xxx 2. yyy"
                                normalizedText = normalizedText.replace(/(?<=[^\n])\s*(\d+\.\s)/g, '\n$1');

                                // Clean up
                                normalizedText = normalizedText.replace(/\n+/g, '\n').trim();

                                return normalizedText.split('\n').map((line, i) => {
                                    const trimmedLine = line.trim();
                                    if (!trimmedLine) return null;

                                    // Handle numbered items
                                    const numberedMatch = trimmedLine.match(/^(\d+)\.\s*(.*)$/);
                                    if (numberedMatch) {
                                        const [, num, text] = numberedMatch;
                                        return (
                                            <div key={i} className="flex items-start gap-2 py-1">
                                                <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    {num}
                                                </span>
                                                <span className="text-slate-700">{parseBoldText(text)}</span>
                                            </div>
                                        );
                                    }

                                    // Handle bullet items
                                    if (trimmedLine.startsWith('-') || trimmedLine.startsWith('•')) {
                                        return (
                                            <div key={i} className="flex items-start gap-2 ml-2 py-0.5">
                                                <span className="text-teal-600 mt-1">•</span>
                                                <span>{parseBoldText(trimmedLine.replace(/^[-•]\s*/, ''))}</span>
                                            </div>
                                        );
                                    }

                                    // Handle bold text
                                    if (trimmedLine.includes('**')) {
                                        return <span key={i}>{parseBoldText(trimmedLine)}<br /></span>;
                                    }

                                    return <span key={i}>{trimmedLine}<br /></span>;
                                }).filter(Boolean);
                            };

                            // Helper to parse bold text
                            const parseBoldText = (str: string) => {
                                if (!str.includes('**')) return str;
                                const parts = str.split(/\*\*(.*?)\*\*/g);
                                return parts.map((part, j) =>
                                    j % 2 === 1
                                        ? <strong key={j} className="text-slate-800">{part}</strong>
                                        : part
                                );
                            };

                            // Color themes
                            const colorThemes = [
                                { bg: 'bg-blue-50', border: 'border-blue-200', accent: 'text-blue-700', icon: 'bg-blue-100' },
                                { bg: 'bg-rose-50', border: 'border-rose-200', accent: 'text-rose-700', icon: 'bg-rose-100' },
                                { bg: 'bg-emerald-50', border: 'border-emerald-200', accent: 'text-emerald-700', icon: 'bg-emerald-100' },
                                { bg: 'bg-amber-50', border: 'border-amber-200', accent: 'text-amber-700', icon: 'bg-amber-100' },
                                { bg: 'bg-purple-50', border: 'border-purple-200', accent: 'text-purple-700', icon: 'bg-purple-100' },
                                { bg: 'bg-cyan-50', border: 'border-cyan-200', accent: 'text-cyan-700', icon: 'bg-cyan-100' },
                                { bg: 'bg-orange-50', border: 'border-orange-200', accent: 'text-orange-700', icon: 'bg-orange-100' },
                            ];
                            const theme = colorThemes[(cardNumber - 1) % colorThemes.length];

                            return (
                                <div
                                    key={rowIndex}
                                    className={`rounded-xl border-2 ${theme.border} ${theme.bg} overflow-hidden transition-all hover:shadow-md`}
                                >
                                    {/* Card Header */}
                                    <div className={`px-4 py-3 border-b ${theme.border} flex items-center gap-3`}>
                                        <div className={`w-8 h-8 rounded-lg ${theme.icon} flex items-center justify-center font-bold ${theme.accent} text-sm`}>
                                            {cardNumber}
                                        </div>
                                        <h5 className={`font-bold ${theme.accent} text-base`}>
                                            {cardTitle}
                                        </h5>
                                    </div>

                                    {/* Card Content */}
                                    <div className="px-4 py-3 bg-white/60">
                                        <div className="text-slate-700 text-sm leading-relaxed">
                                            {parseContent(cardContent)}
                                        </div>

                                        {/* Reference if exists */}
                                        {reference && (
                                            <div className="mt-3 pt-3 border-t border-slate-100 flex items-start gap-2">
                                                <BookOpen className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                                <span className="text-xs text-slate-500 italic">{reference}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* After table content */}
                {afterTable && (
                    <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-amber-800 leading-relaxed whitespace-pre-wrap">
                                {afterTable}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

interface AIResults {
    soap: {
        subjective: string;
        objective: string;
        assessment: string;
        plan: string;
    };
    icdCodes: Array<{ code: string; description: string }>;
    medicalAdvice?: string;
}

interface MedicalRecordReviewProps {
    sessionId: string;
    aiResults: AIResults;
    onSave: (data: MedicalRecordData, isFinal: boolean) => void;
    onComparison?: () => void;
    readOnly?: boolean;  // If true, show read-only view with "Tiếp theo" button
    onProceed?: () => void;  // Callback when "Tiếp theo" is clicked
}

export interface MedicalRecordData {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    icdCodes: string[];
}

export default function MedicalRecordReview({
    sessionId,
    aiResults,
    onSave,
    onComparison,
    readOnly = false,
    onProceed,
}: MedicalRecordReviewProps) {
    // Helper: Format text with numbered items and dashes to have proper line breaks
    const formatNumberedList = (text: string): string => {
        if (!text) return '';
        // Replace <br> tags with newlines
        let formatted = text.replace(/<br\s*\/?>/gi, '\n');
        // Add newline before dash items like "- item"
        formatted = formatted.replace(/\.\s*-\s+/g, '.\n- ');
        // Add newline before numbered items (but not at the start)
        formatted = formatted.replace(/(?<!^)(\d+\.\s)/gm, '\n$1');
        // Clean up multiple newlines
        formatted = formatted.replace(/\n{3,}/g, '\n\n').trim();
        return formatted;
    };

    // Initialize form data from AI results with formatted text
    const [formData, setFormData] = useState<MedicalRecordData>({
        subjective: formatNumberedList(aiResults.soap.subjective || ''),
        objective: formatNumberedList(aiResults.soap.objective || ''),
        assessment: formatNumberedList(aiResults.soap.assessment || ''),
        plan: formatNumberedList(aiResults.soap.plan || ''),
        icdCodes: aiResults.icdCodes?.map(item => item.code) || [],
    });

    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [selectedIcdCodes, setSelectedIcdCodes] = useState<string[]>(
        aiResults.icdCodes?.map(item => item.code) || []
    );

    // Update form data when field changes
    const handleFieldChange = (field: keyof MedicalRecordData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Handle ICD code selection change from picker
    const handleIcdCodesChange = (codes: string[]) => {
        setSelectedIcdCodes(codes);
        setFormData(prev => ({ ...prev, icdCodes: codes }));
    };

    // Magic Fill: Accept all AI suggestions
    const handleMagicFill = () => {
        setFormData({
            subjective: aiResults.soap.subjective || '',
            objective: aiResults.soap.objective || '',
            assessment: aiResults.soap.assessment || '',
            plan: aiResults.soap.plan || '',
            icdCodes: aiResults.icdCodes?.map(item => item.code) || [],
        });
        setSelectedIcdCodes(aiResults.icdCodes?.map(item => item.code) || []);
        setSaveMessage({ type: 'success', text: '✨ Đã áp dụng toàn bộ gợi ý AI!' });
    };

    // Keyboard shortcut: Ctrl+Enter to save
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                if (!isSaving && formData.assessment && formData.icdCodes.length > 0) {
                    handleFinalSave();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSaving, formData]);

    // Save draft
    const handleSaveDraft = async () => {
        setIsSaving(true);
        setSaveMessage(null);

        try {
            const response = await fetch('/api/medical-record/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    ...formData,
                    status: 'draft',
                }),
            });

            const result = await response.json();

            if (result.success) {
                setSaveMessage({ type: 'success', text: 'Bệnh án nháp đã được lưu' });
                onSave(formData, false);
            } else {
                setSaveMessage({ type: 'error', text: result.message || 'Không thể lưu bệnh án' });
            }
        } catch (error) {
            setSaveMessage({ type: 'error', text: 'Lỗi kết nối. Vui lòng thử lại.' });
            console.error('Error saving draft:', error);
        } finally {
            setIsSaving(false);
        }
    };

    // Final save
    const handleFinalSave = async () => {
        // Validation
        if (!formData.assessment || formData.icdCodes.length === 0) {
            setSaveMessage({
                type: 'error',
                text: 'Chẩn đoán và mã ICD-10 là bắt buộc khi lưu bệnh án chính thức'
            });
            return;
        }

        setIsSaving(true);
        setSaveMessage(null);

        try {
            // Save medical record
            const response = await fetch('/api/medical-record/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    ...formData,
                    status: 'final',
                }),
            });

            const result = await response.json();

            if (result.success) {
                setSaveMessage({
                    type: 'success',
                    text: 'Bệnh án đã được lưu và đồng bộ với HIS'
                });
                onSave(formData, true);

                // Trigger comparison after successful save
                if (onComparison) {
                    onComparison();
                }
            } else {
                setSaveMessage({ type: 'error', text: result.message || 'Không thể lưu bệnh án' });
            }
        } catch (error) {
            setSaveMessage({ type: 'error', text: 'Lỗi kết nối. Vui lòng thử lại.' });
            console.error('Error saving final record:', error);
        } finally {
            setIsSaving(false);
        }
    };

    // Tab configuration
    const tabs: TabItem[] = [
        {
            label: 'Khám bệnh',
            value: 'examination',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            ),
            content: (
                <div className="space-y-5">
                    <Textarea
                        label="Triệu chứng (Subjective)"
                        placeholder="Lời kể của bệnh nhân về triệu chứng..."
                        value={formData.subjective}
                        onChange={(e) => handleFieldChange('subjective', e.target.value)}
                        rows={5}
                        helperText="Ghi lại lời kể của bệnh nhân về các triệu chứng, cảm giác khó chịu"
                        readOnly={readOnly}
                        className={readOnly ? 'bg-slate-50 cursor-not-allowed' : ''}
                    />

                    <Textarea
                        label="Sinh hiệu & Khám lâm sàng (Objective)"
                        placeholder="Huyết áp, mạch, nhiệt độ, kết quả khám..."
                        value={formData.objective}
                        onChange={(e) => handleFieldChange('objective', e.target.value)}
                        rows={5}
                        helperText="Ghi nhận các sinh hiệu và kết quả khám lâm sàng khách quan"
                        readOnly={readOnly}
                        className={readOnly ? 'bg-slate-50 cursor-not-allowed' : ''}
                    />
                </div>
            ),
        },
        {
            label: 'Chẩn đoán',
            value: 'diagnosis',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
            ),
            content: (
                <div className="space-y-5">
                    <Textarea
                        label="Chẩn đoán (Assessment)"
                        placeholder="Kết luận chẩn đoán bệnh..."
                        value={formData.assessment}
                        onChange={(e) => handleFieldChange('assessment', e.target.value)}
                        rows={4}
                        helperText="Chẩn đoán chính xác dựa trên triệu chứng và khám lâm sàng"
                        error={!readOnly && !formData.assessment ? 'Chẩn đoán là bắt buộc' : undefined}
                        readOnly={readOnly}
                        className={readOnly ? 'bg-slate-50 cursor-not-allowed' : ''}
                    />

                    {/* ICD-10 Code Display or Picker */}
                    <div>
                        <label className="block mb-3 text-sm font-semibold text-slate-700">
                            Mã ICD-10
                            {!readOnly && selectedIcdCodes.length === 0 && (
                                <span className="ml-2 text-red-600 text-xs">* Bắt buộc</span>
                            )}
                        </label>

                        {readOnly ? (
                            // Read-only: just display the codes
                            <div className="flex flex-wrap gap-2">
                                {selectedIcdCodes.map((code) => {
                                    const codeInfo = aiResults.icdCodes?.find(c => c.code === code);
                                    return (
                                        <span
                                            key={code}
                                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-sky-100 text-sky-800 rounded-full text-sm border border-sky-200"
                                        >
                                            <span className="font-mono font-semibold">{code}</span>
                                            {codeInfo?.description && (
                                                <span className="text-sky-600">{codeInfo.description}</span>
                                            )}
                                        </span>
                                    );
                                })}
                            </div>
                        ) : (
                            <ICD10Picker
                                selectedCodes={selectedIcdCodes}
                                suggestedCodes={aiResults.icdCodes}
                                onChange={handleIcdCodesChange}
                                maxSelections={10}
                            />
                        )}
                    </div>
                </div>
            ),
        },
        {
            label: 'Điều trị',
            value: 'treatment',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
            ),
            content: (
                <div className="space-y-5">
                    <Textarea
                        label="Kế hoạch điều trị (Plan)"
                        placeholder="Thuốc, liệu pháp, lời khuyên..."
                        value={formData.plan}
                        onChange={(e) => handleFieldChange('plan', e.target.value)}
                        rows={6}
                        helperText="Chi tiết về thuốc, liều dùng, tái khám và lời khuyên cho bệnh nhân"
                        readOnly={readOnly}
                        className={readOnly ? 'bg-slate-50 cursor-not-allowed' : ''}
                    />

                    {/* AI Medical Advice (Read-only) - Enhanced Display */}
                    {aiResults.medicalAdvice && (
                        <AIAdviceDisplay advice={aiResults.medicalAdvice} />
                    )}
                </div>
            ),
        },
    ];

    return (
        <Card className="mt-6">
            {/* Tabs for SOAP sections */}
            <Tabs tabs={tabs} defaultTab="examination" />

            {/* Save Message (only in edit mode) */}
            {!readOnly && saveMessage && (
                <div className={`mx-6 mb-4 p-4 rounded-lg ${saveMessage.type === 'success'
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                    }`}>
                    <p className={`text-sm flex items-center gap-2 ${saveMessage.type === 'success' ? 'text-green-700' : 'text-red-700'
                        }`}>
                        {saveMessage.type === 'success' ? (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        )}
                        {saveMessage.text}
                    </p>
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end items-center gap-4 px-6 pb-6">
                {readOnly ? (
                    /* Read-only mode: "Tiếp theo" button */
                    <Button
                        variant="primary"
                        onClick={onProceed}
                        className="px-8 py-3 text-lg font-semibold flex items-center gap-2"
                    >
                        Tiếp theo
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </Button>
                ) : (
                    /* Edit mode: Save buttons */
                    <>
                        <Button
                            variant="secondary"
                            onClick={handleSaveDraft}
                            disabled={isSaving}
                            className="px-6 py-3"
                        >
                            {isSaving ? 'Đang lưu...' : 'Lưu nháp'}
                        </Button>

                        <Button
                            variant="primary"
                            onClick={handleFinalSave}
                            disabled={isSaving || !formData.assessment || formData.icdCodes.length === 0}
                            className="px-8 py-3 text-lg font-semibold relative"
                        >
                            {isSaving ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Đang lưu...
                                </span>
                            ) : (
                                <>
                                    <Save className="w-5 h-5 inline mr-2" />
                                    Lưu bệnh án (Final)
                                    <span className="ml-3 text-xs bg-white/20 px-2 py-1 rounded font-mono">
                                        Ctrl+Enter
                                    </span>
                                </>
                            )}
                        </Button>
                    </>
                )}
            </div>
        </Card>
    );
}
