"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatCurrency, formatPercent } from "@/lib/calculations"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { GripVertical } from "lucide-react"
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
      <Table>
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
              return (
              <TableHead
                key={column.key}
                className={cn("cursor-pointer relative group select-none", alignClass)}
                draggable={!column.required}
                onDragStart={(e) => !column.required && handleDragStart(e, column.key)}
                onDragOver={(e) => !column.required && handleDragOver(e, column.key)}
                onDrop={(e) => !column.required && handleDrop(e, column.key)}
                onClick={() => onSort(column.key)}
              >
                <div className={cn("flex items-center gap-2", justifyClass)}>
                  <span className="truncate">{column.label}</span>
                  {!column.required && (
                    <GripVertical className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
                
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
                return (
                  <TableCell key={column.key} className={alignClass}>
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
