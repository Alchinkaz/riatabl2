"use client"

import React, { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatPercent } from "@/lib/calculations"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { GripVertical, AlignLeft, AlignCenter, AlignRight } from "lucide-react"
import type { StoredRecord } from "@/lib/storage"
import type { ColumnConfig } from "./column-visibility-control"
import { cn } from "@/lib/utils"

interface DraggableTableProps {
  columns: ColumnConfig[]
  records: StoredRecord[]
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onSelectAllFiltered: (checked: boolean, ids?: string[]) => void
  onViewRecord: (record: StoredRecord) => void
  onSort: (key: string) => void
  sortKey: string
  sortDir: "asc" | "desc"
  getUserName: (userId: string) => string
  getRowBgColor: (margin: number) => string
  getMarginColor: (margin: number) => string
  onColumnsChange: (columns: ColumnConfig[]) => void
}

export function DraggableTable({
  columns,
  records,
  selectedIds,
  onToggleSelect,
  onSelectAllFiltered,
  onViewRecord,
  onSort,
  sortKey,
  sortDir,
  getUserName,
  getRowBgColor,
  getMarginColor,
  onColumnsChange
}: DraggableTableProps) {
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const [resizingColumn, setResizingColumn] = useState<string | null>(null)
  const [resizeStartX, setResizeStartX] = useState<number>(0)
  const [resizeStartWidth, setResizeStartWidth] = useState<number>(0)

  // Обработка начала перетаскивания колонки
  const handleDragStart = (e: React.DragEvent, columnKey: string) => {
    setDraggedColumn(columnKey)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', columnKey)
  }

  // Обработка перетаскивания над колонкой
  const handleDragOver = (e: React.DragEvent, columnKey: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverColumn(columnKey)
  }

  // Обработка окончания перетаскивания
  const handleDrop = (e: React.DragEvent, targetColumnKey: string) => {
    e.preventDefault()
    
    if (!draggedColumn || draggedColumn === targetColumnKey) {
      setDraggedColumn(null)
      setDragOverColumn(null)
      return
    }

    // Находим индексы колонок
    const draggedIndex = columns.findIndex(col => col.key === draggedColumn)
    const targetIndex = columns.findIndex(col => col.key === targetColumnKey)
    
    if (draggedIndex === -1 || targetIndex === -1) return

    // Создаем новый массив колонок
    const newColumns = [...columns]
    const draggedColumnData = newColumns[draggedIndex]
    
    // Удаляем перетаскиваемую колонку
    newColumns.splice(draggedIndex, 1)
    
    // Вставляем её в новую позицию
    newColumns.splice(targetIndex, 0, draggedColumnData)
    
    // Обновляем порядок
    const updatedColumns = newColumns.map((col, index) => ({
      ...col,
      order: col.required ? undefined : index
    }))

    onColumnsChange(updatedColumns)
    setDraggedColumn(null)
    setDragOverColumn(null)
  }

  // Обработка изменения выравнивания колонки
  const handleAlignChange = (columnKey: string) => {
    const column = columns.find(col => col.key === columnKey)
    if (!column) return

    const currentAlign = column.cellAlign || "left"
    let nextAlign: "left" | "center" | "right"

    // Циклическое переключение: left -> center -> right -> left
    if (currentAlign === "left") {
      nextAlign = "center"
    } else if (currentAlign === "center") {
      nextAlign = "right"
    } else {
      nextAlign = "left"
    }

    const updatedColumns = columns.map(col =>
      col.key === columnKey ? { ...col, cellAlign: nextAlign } : col
    )

    onColumnsChange(updatedColumns)
  }

  // Получить иконку выравнивания
  const getAlignIcon = (align?: "left" | "center" | "right") => {
    switch (align) {
      case "center":
        return <AlignCenter className="h-4 w-4" />
      case "right":
        return <AlignRight className="h-4 w-4" />
      default:
        return <AlignLeft className="h-4 w-4" />
    }
  }

  // Обработка начала изменения ширины колонки
  const handleResizeStart = (e: React.MouseEvent, columnKey: string) => {
    e.preventDefault()
    e.stopPropagation()
    const column = columns.find(col => col.key === columnKey)
    if (!column) return

    setResizingColumn(columnKey)
    setResizeStartX(e.clientX)
    setResizeStartWidth(column.width || 150)
  }

  // Обработка изменения ширины во время перетаскивания
  React.useEffect(() => {
    if (!resizingColumn) return

    let currentStartX = resizeStartX
    let currentStartWidth = resizeStartWidth

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - currentStartX
      const newWidth = Math.max(50, currentStartWidth + diff)

      const updatedColumns = columns.map(col =>
        col.key === resizingColumn ? { ...col, width: newWidth } : col
      )

      onColumnsChange(updatedColumns)
    }

    const handleMouseUp = () => {
      setResizingColumn(null)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [resizingColumn, resizeStartX, resizeStartWidth, columns, onColumnsChange])

  // Рендер ячейки таблицы
  const renderTableCell = (record: StoredRecord, column: ColumnConfig) => {
    const value = (record as any)[column.key]
    
    switch (column.key) {
      case "date":
        return record.date && !isNaN(new Date(record.date).getTime())
          ? format(new Date(record.date), "dd.MM.yyyy", { locale: ru })
          : "Не указана"
      
      case "counterparty":
        return <span className="font-medium">{record.counterparty}</span>
      
      case "author":
        return getUserName(record.created_by)
      
      case "total_net_income":
        return (
          <Badge variant="secondary" className="text-red-600 bg-red-50">
            {formatCurrency(value || 0)}
          </Badge>
        )
      
      case "margin_percent":
        return (
          <Badge variant="secondary" className={getMarginColor(value || 0)}>
            {formatPercent(value || 0)}
          </Badge>
        )
      
      default:
        if (typeof value === 'number') {
          // Проверяем, является ли это процентным полем
          if (column.key.includes('percent') || column.key.includes('%')) {
            return formatPercent(value)
          }
          return formatCurrency(value)
        }
        return value || ""
    }
  }

  return (
    <div className="overflow-x-auto">
      <Table className="w-full">
        <TableHeader>
          <TableRow>
            <TableHead>
              <input
                type="checkbox"
                checked={records.length > 0 && records.every((record) => selectedIds.has(record.id))}
                onChange={(e) => onSelectAllFiltered(e.target.checked, records.map((record) => record.id))}
              />
            </TableHead>
            {columns.filter(col => col.visible).map((column) => {
              const alignment = column.cellAlign ?? "left"
              const alignClass =
                alignment === "right"
                  ? "text-right"
                  : alignment === "center"
                    ? "text-center"
                    : "text-left"
              const justifyClass =
                alignment === "right"
                  ? "justify-end"
                  : alignment === "center"
                    ? "justify-center"
                    : "justify-between"
              const columnWidth = column.width
              return (
              <TableHead
                key={column.key}
                className={cn("cursor-pointer relative group select-none", alignClass)}
                style={columnWidth ? { minWidth: `${columnWidth}px` } : undefined}
                draggable={!column.required}
                onDragStart={(e) => !column.required && handleDragStart(e, column.key)}
                onDragOver={(e) => !column.required && handleDragOver(e, column.key)}
                onDrop={(e) => !column.required && handleDrop(e, column.key)}
                onClick={() => onSort(column.key)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  handleAlignChange(column.key)
                }}
              >
                <div className={cn("flex items-center gap-2 w-full", justifyClass)}>
                  <span className="truncate">{column.label}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleAlignChange(column.key)
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      title="Изменить выравнивание (правый клик или клик по иконке)"
                    >
                      {getAlignIcon(column.cellAlign || "left")}
                    </button>
                    {!column.required && (
                      <GripVertical className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                </div>
                
                {/* Индикатор изменения ширины */}
                <div
                  className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-400 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  onMouseDown={(e) => handleResizeStart(e, column.key)}
                  title="Перетащите для изменения ширины колонки"
                />
                
                {/* Индикатор перетаскивания */}
                {draggedColumn === column.key && (
                  <div className="absolute inset-0 bg-blue-100 border-2 border-blue-500 rounded opacity-50" />
                )}
                
                {dragOverColumn === column.key && draggedColumn !== column.key && (
                  <div className="absolute inset-0 bg-green-100 border-2 border-green-500 rounded opacity-50" />
                )}
              </TableHead>
              )
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => (
            <TableRow
              key={record.id}
              className={`${getRowBgColor(record.margin_percent || 0)} cursor-pointer`}
              onDoubleClick={() => onViewRecord(record)}
            >
              <TableCell>
                <input
                  type="checkbox"
                  checked={selectedIds.has(record.id)}
                  onChange={() => onToggleSelect(record.id)}
                />
              </TableCell>
              {columns.filter(col => col.visible).map((column) => {
                const alignment = column.cellAlign ?? "left"
                const alignClass =
                  alignment === "right"
                    ? "text-right"
                    : alignment === "center"
                      ? "text-center"
                      : "text-left"
                const columnWidth = column.width
                return (
                  <TableCell
                    key={column.key}
                    className={alignClass}
                    style={columnWidth ? { minWidth: `${columnWidth}px` } : undefined}
                  >
                    {renderTableCell(record, column)}
                  </TableCell>
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
