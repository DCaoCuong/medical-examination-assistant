'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Plus, Check } from 'lucide-react';

// Common Vietnamese ICD-10 codes used in primary care
const COMMON_ICD_CODES = [
    // Respiratory
    { code: 'J00', description: 'Viêm mũi họng cấp (cảm lạnh thông thường)' },
    { code: 'J02', description: 'Viêm họng cấp' },
    { code: 'J03', description: 'Viêm amidan cấp' },
    { code: 'J06', description: 'Nhiễm trùng đường hô hấp trên cấp' },
    { code: 'J11', description: 'Cúm, virus không xác định' },
    { code: 'J18', description: 'Viêm phổi, không xác định tác nhân' },
    { code: 'J20', description: 'Viêm phế quản cấp' },
    { code: 'J30', description: 'Viêm mũi dị ứng' },
    { code: 'J40', description: 'Viêm phế quản mạn' },
    { code: 'J42', description: 'Viêm phế quản mạn không đặc hiệu' },
    { code: 'J45', description: 'Hen phế quản' },

    // Gastrointestinal
    { code: 'K21', description: 'Bệnh trào ngược dạ dày thực quản (GERD)' },
    { code: 'K25', description: 'Loét dạ dày' },
    { code: 'K26', description: 'Loét tá tràng' },
    { code: 'K29', description: 'Viêm dạ dày - tá tràng' },
    { code: 'K30', description: 'Chứng khó tiêu chức năng' },
    { code: 'K52', description: 'Viêm dạ dày ruột và viêm đại tràng' },
    { code: 'K58', description: 'Hội chứng ruột kích thích (IBS)' },
    { code: 'K59', description: 'Táo bón' },

    // Cardiovascular
    { code: 'I10', description: 'Tăng huyết áp vô căn (nguyên phát)' },
    { code: 'I11', description: 'Bệnh tim do tăng huyết áp' },
    { code: 'I20', description: 'Đau thắt ngực' },
    { code: 'I25', description: 'Bệnh tim thiếu máu cục bộ mạn' },
    { code: 'I50', description: 'Suy tim' },

    // Endocrine
    { code: 'E03', description: 'Suy giáp' },
    { code: 'E05', description: 'Cường giáp' },
    { code: 'E11', description: 'Đái tháo đường type 2' },
    { code: 'E14', description: 'Đái tháo đường không đặc hiệu' },
    { code: 'E66', description: 'Béo phì' },
    { code: 'E78', description: 'Rối loạn chuyển hóa lipid' },

    // Musculoskeletal
    { code: 'M54', description: 'Đau lưng' },
    { code: 'M79', description: 'Đau cơ xương khớp' },
    { code: 'M25', description: 'Rối loạn khớp khác' },
    { code: 'M17', description: 'Thoái hóa khớp gối' },
    { code: 'M19', description: 'Thoái hóa khớp khác' },

    // Mental health
    { code: 'F32', description: 'Trầm cảm' },
    { code: 'F41', description: 'Rối loạn lo âu' },
    { code: 'F51', description: 'Rối loạn giấc ngủ không thực thể' },
    { code: 'G47', description: 'Rối loạn giấc ngủ' },

    // Neurological
    { code: 'G43', description: 'Đau nửa đầu (Migraine)' },
    { code: 'G44', description: 'Hội chứng đau đầu khác' },
    { code: 'R51', description: 'Đau đầu' },

    // Dermatology
    { code: 'L20', description: 'Viêm da cơ địa' },
    { code: 'L30', description: 'Viêm da khác' },
    { code: 'L50', description: 'Mề đay' },

    // Urinary
    { code: 'N30', description: 'Viêm bàng quang' },
    { code: 'N39', description: 'Nhiễm trùng đường tiết niệu' },

    // General symptoms
    { code: 'R50', description: 'Sốt không rõ nguyên nhân' },
    { code: 'R05', description: 'Ho' },
    { code: 'R10', description: 'Đau bụng' },
    { code: 'R11', description: 'Buồn nôn và nôn' },
    { code: 'R53', description: 'Mệt mỏi' },
    { code: 'R42', description: 'Chóng mặt' },
];

export interface IcdCodeItem {
    code: string;
    description: string;
}

interface ICD10PickerProps {
    selectedCodes: string[];
    suggestedCodes?: IcdCodeItem[];
    onChange: (codes: string[]) => void;
    maxSelections?: number;
}

export default function ICD10Picker({
    selectedCodes,
    suggestedCodes = [],
    onChange,
    maxSelections = 10
}: ICD10PickerProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [customCode, setCustomCode] = useState('');
    const [customDescription, setCustomDescription] = useState('');
    const [showAddCustom, setShowAddCustom] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Merge suggested codes with common codes, prioritizing suggested ones
    const allCodes = useMemo(() => {
        const codeMap = new Map<string, IcdCodeItem>();

        // Add common codes first
        COMMON_ICD_CODES.forEach(item => {
            codeMap.set(item.code, item);
        });

        // Override/add suggested codes (higher priority)
        suggestedCodes.forEach(item => {
            codeMap.set(item.code, item);
        });

        return Array.from(codeMap.values());
    }, [suggestedCodes]);

    // Get selected items with descriptions
    const selectedItems = useMemo(() => {
        return selectedCodes.map(code => {
            const found = allCodes.find(item => item.code === code);
            return found || { code, description: '' };
        });
    }, [selectedCodes, allCodes]);

    // Filter codes based on search
    const filteredCodes = useMemo(() => {
        if (!searchQuery.trim()) {
            // Show suggested codes first, then common ones
            const suggestedSet = new Set(suggestedCodes.map(s => s.code));
            const suggested = allCodes.filter(item => suggestedSet.has(item.code));
            const others = allCodes.filter(item => !suggestedSet.has(item.code));
            return [...suggested, ...others].slice(0, 20);
        }

        const query = searchQuery.toLowerCase();
        return allCodes.filter(item =>
            item.code.toLowerCase().includes(query) ||
            item.description.toLowerCase().includes(query)
        ).slice(0, 20);
    }, [searchQuery, allCodes, suggestedCodes]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleCode = (code: string) => {
        if (selectedCodes.includes(code)) {
            onChange(selectedCodes.filter(c => c !== code));
        } else if (selectedCodes.length < maxSelections) {
            onChange([...selectedCodes, code]);
        }
    };

    const removeCode = (code: string) => {
        onChange(selectedCodes.filter(c => c !== code));
    };

    const addCustomCode = () => {
        if (customCode.trim() && !selectedCodes.includes(customCode.trim())) {
            onChange([...selectedCodes, customCode.trim().toUpperCase()]);
            setCustomCode('');
            setCustomDescription('');
            setShowAddCustom(false);
        }
    };

    return (
        <div className="space-y-3">
            {/* Selected codes as chips */}
            {selectedItems.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {selectedItems.map((item) => (
                        <div
                            key={item.code}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-sky-100 text-sky-800 rounded-full text-sm border border-sky-200"
                        >
                            <span className="font-mono font-semibold">{item.code}</span>
                            {item.description && (
                                <span className="text-sky-600 hidden sm:inline max-w-[200px] truncate">
                                    {item.description}
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={() => removeCode(item.code)}
                                className="p-0.5 hover:bg-sky-200 rounded-full transition"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Search input with dropdown */}
            <div ref={dropdownRef} className="relative">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Tìm mã ICD-10 (ví dụ: J00, viêm họng...)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setIsOpen(true)}
                        className="w-full pl-10 pr-4 py-3 border-2 border-slate-200 rounded-xl focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none transition"
                    />
                </div>

                {/* Dropdown */}
                {isOpen && (
                    <div className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-slate-200 max-h-72 overflow-y-auto">
                        {/* Suggested codes header */}
                        {suggestedCodes.length > 0 && !searchQuery && (
                            <div className="px-4 py-2 bg-sky-50 border-b border-sky-100">
                                <span className="text-xs font-semibold text-sky-600 uppercase">
                                    ✨ Đề xuất từ AI
                                </span>
                            </div>
                        )}

                        {filteredCodes.length > 0 ? (
                            <ul className="py-1">
                                {filteredCodes.map((item, idx) => {
                                    const isSelected = selectedCodes.includes(item.code);
                                    const isSuggested = suggestedCodes.some(s => s.code === item.code);

                                    return (
                                        <li key={item.code}>
                                            <button
                                                type="button"
                                                onClick={() => toggleCode(item.code)}
                                                className={`
                                                    w-full px-4 py-3 text-left flex items-center gap-3 transition
                                                    ${isSelected
                                                        ? 'bg-sky-50 text-sky-700'
                                                        : 'hover:bg-slate-50'
                                                    }
                                                    ${idx > 0 && !searchQuery && idx === suggestedCodes.length ? 'border-t border-slate-100' : ''}
                                                `}
                                            >
                                                <div className={`
                                                    w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0
                                                    ${isSelected
                                                        ? 'bg-sky-500 border-sky-500 text-white'
                                                        : 'border-slate-300'
                                                    }
                                                `}>
                                                    {isSelected && <Check className="w-3 h-3" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className="font-mono font-semibold text-sky-600">
                                                        {item.code}
                                                    </span>
                                                    <span className="ml-2 text-slate-700">
                                                        {item.description}
                                                    </span>
                                                    {isSuggested && !searchQuery && (
                                                        <span className="ml-2 text-xs bg-sky-100 text-sky-600 px-2 py-0.5 rounded">
                                                            AI
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <div className="p-4 text-center text-slate-500">
                                <p className="text-sm">Không tìm thấy mã ICD-10 phù hợp</p>
                            </div>
                        )}

                        {/* Add custom code option */}
                        <div className="border-t border-slate-100 p-3">
                            {!showAddCustom ? (
                                <button
                                    type="button"
                                    onClick={() => setShowAddCustom(true)}
                                    className="w-full flex items-center gap-2 text-sm text-slate-600 hover:text-sky-600 transition py-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    Thêm mã ICD-10 khác
                                </button>
                            ) : (
                                <div className="space-y-2">
                                    <input
                                        type="text"
                                        placeholder="Mã ICD-10 (VD: J00)"
                                        value={customCode}
                                        onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-sky-500 outline-none"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Mô tả (không bắt buộc)"
                                        value={customDescription}
                                        onChange={(e) => setCustomDescription(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-sky-500 outline-none"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={addCustomCode}
                                            disabled={!customCode.trim()}
                                            className="flex-1 px-3 py-2 bg-sky-500 text-white text-sm rounded-lg hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                        >
                                            Thêm
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setShowAddCustom(false)}
                                            className="px-3 py-2 text-slate-600 text-sm hover:bg-slate-100 rounded-lg transition"
                                        >
                                            Hủy
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Selection count */}
            <p className="text-sm text-slate-500">
                Đã chọn: <span className="font-semibold text-sky-600">{selectedCodes.length}</span>
                {maxSelections && <span> / {maxSelections} mã</span>}
            </p>
        </div>
    );
}
