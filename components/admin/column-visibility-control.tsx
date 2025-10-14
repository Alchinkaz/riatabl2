"use client"

import { useState } from "react"
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
}

interface ColumnVisibilityControlProps {
  columns: ColumnConfig[]
  onColumnsChange: (columns: ColumnConfig[]) => void
}

export function ColumnVisibilityControl({ columns, onColumnsChange }: ColumnVisibilityControlProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleColumnToggle = (key: string, visible: boolean) => {
    const updatedColumns = columns.map(col => 
      col.key === key ? { ...col, visible } : col
    )
    onColumnsChange(updatedColumns)
  }

  const handleSelectAll = () => {
    const allVisible = columns.every(col => col.visible)
    const updatedColumns = columns.map(col => ({ ...col, visible: !allVisible }))
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
                    onCheckedChange={(checked) => 
                      handleColumnToggle(column.key, checked as boolean)
                    }
                    className="mt-0.5"
                  />
                  <div className="space-y-1 flex-1">
                    <Label
                      htmlFor={column.key}
                      className="text-sm font-medium cursor-pointer"
                    >
                      {column.label}
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
