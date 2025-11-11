"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { loadAdminColumns, saveAdminColumns } from "@/lib/ui-settings"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Settings, Eye, EyeOff } from "lucide-react"

export interface ColumnConfig {
  key: string
  label: string
  description?: string
  visible: boolean
  required?: boolean
  order?: number
  cellAlign?: "left" | "center" | "right"
}

interface ColumnVisibilityControlProps {
  columns: ColumnConfig[]
  onColumnsChange: (columns: ColumnConfig[]) => void
}

export function ColumnVisibilityControl({ columns, onColumnsChange }: ColumnVisibilityControlProps) {
  const [isOpen, setIsOpen] = useState(false)
  const hasLoaded = useRef(false)
  const { user } = useAuth()

  // Загружаем сохраненные настройки колонок при монтировании
  useEffect(() => {
    if (hasLoaded.current) return
    
    ;(async () => {
      try {
        // 1) Try cloud
        if (user?.id) {
          const cloud = await loadAdminColumns(user.id)
          if (cloud && Array.isArray(cloud)) {
            const updatedColumns = columns.map(col => {
              const savedCol = cloud.find((s: ColumnConfig) => s.key === col.key)
              return savedCol
                ? {
                    ...col,
                    visible: savedCol.visible,
                    order: savedCol.order,
                    cellAlign: savedCol.cellAlign ?? col.cellAlign,
                  }
                : col
            })
            const sortedColumns = updatedColumns.sort((a, b) => {
              if (a.required && !b.required) return -1
              if (!a.required && b.required) return 1
              if (a.required && b.required) return 0
              const orderA = a.order || 999
              const orderB = b.order || 999
              return orderA - orderB
            })
            onColumnsChange(sortedColumns)
            hasLoaded.current = true
            return
          }
        }
        // 2) Fallback to localStorage
        const savedColumns = localStorage.getItem('admin-column-visibility')
        if (savedColumns) {
          const parsedColumns = JSON.parse(savedColumns)
          const updatedColumns = columns.map(col => {
            const savedCol = parsedColumns.find((s: ColumnConfig) => s.key === col.key)
            return savedCol
              ? {
                  ...col,
                  visible: savedCol.visible,
                  order: savedCol.order,
                  cellAlign: savedCol.cellAlign ?? col.cellAlign,
                }
              : col
          })
          const sortedColumns = updatedColumns.sort((a, b) => {
            if (a.required && !b.required) return -1
            if (!a.required && b.required) return 1
            if (a.required && b.required) return 0
            const orderA = a.order || 999
            const orderB = b.order || 999
            return orderA - orderB
          })
          onColumnsChange(sortedColumns)
        }
      } catch (error) {
        console.error('Ошибка загрузки настроек колонок:', error)
      } finally {
        hasLoaded.current = true
      }
    })()
  }, [columns, onColumnsChange, user?.id])

  // Сохраняем настройки при изменении
  useEffect(() => {
    // Save both cloud (if possible) and local as fallback
    if (user?.id) {
      saveAdminColumns(user.id, columns).catch((e) => console.error('saveAdminColumns failed', e))
    }
    localStorage.setItem('admin-column-visibility', JSON.stringify(columns))
  }, [columns, user?.id])

  const handleColumnToggle = (key: string, visible: boolean) => {
    // Не позволяем скрывать обязательные колонки
    const column = columns.find(col => col.key === key)
    if (column?.required && !visible) {
      return
    }
    
    let updatedColumns = columns.map(col => 
      col.key === key ? { ...col, visible } : col
    )

    // Если колонка становится видимой, добавляем ей порядок
    if (visible && !column?.required) {
      const maxOrder = Math.max(...updatedColumns.filter(col => col.visible && col.order !== undefined).map(col => col.order || 0), 0)
      updatedColumns = updatedColumns.map(col => 
        col.key === key ? { ...col, visible, order: maxOrder + 1 } : col
      )
    }

    // Сортируем колонки по порядку (обязательные сначала, затем по order)
    updatedColumns = updatedColumns.sort((a, b) => {
      if (a.required && !b.required) return -1
      if (!a.required && b.required) return 1
      if (a.required && b.required) return 0
      
      const orderA = a.order || 999
      const orderB = b.order || 999
      return orderA - orderB
    })

    onColumnsChange(updatedColumns)
  }

  const handleSelectAll = () => {
    const nonRequiredColumns = columns.filter(col => !col.required)
    const allNonRequiredVisible = nonRequiredColumns.every(col => col.visible)
    
    let updatedColumns = columns.map(col => 
      col.required ? col : { ...col, visible: !allNonRequiredVisible }
    )

    // Если показываем все, добавляем порядок для необязательных колонок
    if (!allNonRequiredVisible) {
      let orderCounter = 1
      updatedColumns = updatedColumns.map(col => {
        if (!col.required && col.visible) {
          return { ...col, order: orderCounter++ }
        }
        return col
      })
    }

    // Сортируем колонки по порядку
    updatedColumns = updatedColumns.sort((a, b) => {
      if (a.required && !b.required) return -1
      if (!a.required && b.required) return 1
      if (a.required && b.required) return 0
      
      const orderA = a.order || 999
      const orderB = b.order || 999
      return orderA - orderB
    })

    onColumnsChange(updatedColumns)
  }

  const visibleCount = columns.filter(col => col.visible).length
  const totalCount = columns.length

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-2" />
          Колонки ({visibleCount}/{totalCount})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Управление колонками</CardTitle>
            <CardDescription className="text-xs">
              Выберите, какие поля отображать в таблице записей
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="text-xs"
              >
                {columns.every(col => col.visible) ? (
                  <>
                    <EyeOff className="h-3 w-3 mr-1" />
                    Скрыть все
                  </>
                ) : (
                  <>
                    <Eye className="h-3 w-3 mr-1" />
                    Показать все
                  </>
                )}
              </Button>
              <div className="text-xs text-muted-foreground">
                {visibleCount} из {totalCount}
              </div>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {columns.map((column) => (
                <div key={column.key} className="flex items-start space-x-3">
                  <Checkbox
                    id={column.key}
                    checked={column.visible}
                    disabled={column.required}
                    onCheckedChange={(checked) => 
                      handleColumnToggle(column.key, checked as boolean)
                    }
                    className="mt-0.5"
                  />
                  <div className="space-y-1 flex-1">
                    <Label
                      htmlFor={column.key}
                      className={`text-sm font-medium cursor-pointer ${column.required ? 'text-muted-foreground' : ''}`}
                    >
                      {column.label}
                      {column.required && <span className="text-xs text-muted-foreground ml-1">(обязательно)</span>}
                    </Label>
                    {column.description && (
                      <p className="text-xs text-muted-foreground">
                        {column.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  )
}
