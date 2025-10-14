"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatPercent } from "@/lib/calculations"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { Eye, Trash2, GripVertical } from "lucide-react"
import type { StoredRecord } from "@/lib/storage"
import type { ColumnConfig } from "./column-visibility-control"

interface DraggableTableProps {
  columns: ColumnConfig[]
  records: StoredRecord[]
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onSelectAllFiltered: (checked: boolean) => void
  onViewRecord: (record: StoredRecord) => void
  onDeleteRecord: (record: StoredRecord) => void
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
  onDeleteRecord,
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
                checked={records.length > 0 && selectedIds.size === records.length}
                onChange={(e) => onSelectAllFiltered(e.target.checked)}
              />
            </TableHead>
            {columns.filter(col => col.visible).map((column) => (
              <TableHead
                key={column.key}
                className="cursor-pointer relative group select-none"
                draggable={!column.required}
                onDragStart={(e) => !column.required && handleDragStart(e, column.key)}
                onDragOver={(e) => !column.required && handleDragOver(e, column.key)}
                onDrop={(e) => !column.required && handleDrop(e, column.key)}
                onClick={() => onSort(column.key)}
              >
                <div className="flex items-center justify-between">
                  <span>{column.label}</span>
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
            ))}
            <TableHead>Действия</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => (
            <TableRow key={record.id} className={getRowBgColor(record.margin_percent || 0)}>
              <TableCell>
                <input
                  type="checkbox"
                  checked={selectedIds.has(record.id)}
                  onChange={() => onToggleSelect(record.id)}
                />
              </TableCell>
              {columns.filter(col => col.visible).map((column) => (
                <TableCell key={column.key}>
                  {renderTableCell(record, column)}
                </TableCell>
              ))}
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => onViewRecord(record)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteRecord(record)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
