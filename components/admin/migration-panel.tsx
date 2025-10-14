"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Database, CheckCircle, XCircle, AlertTriangle } from "lucide-react"

interface MigrationStats {
  total: number
  updated: number
  errors: number
}

interface MigrationResult {
  success: boolean
  message: string
  stats: MigrationStats
  errors: string[]
}

export function MigrationPanel() {
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<MigrationResult | null>(null)

  const runMigration = async () => {
    setIsRunning(true)
    setResult(null)

    try {
      const response = await fetch('/api/admin/migrate-formulas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        message: `Ошибка запроса: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
        stats: { total: 0, updated: 0, errors: 1 },
        errors: []
      })
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Миграция формул
        </CardTitle>
        <CardDescription>
          Пересчет всех существующих записей с новыми формулами НДС и дохода без КПН
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h4 className="font-medium">Изменения в формулах:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong>НДС:</strong> O = P × 12 / (12 + 100)</li>
            <li>• <strong>Доход без КПН:</strong> T = P - S - K - O</li>
          </ul>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Внимание:</strong> Эта операция пересчитает все существующие записи в базе данных. 
            Рекомендуется создать резервную копию перед запуском.
          </AlertDescription>
        </Alert>

        <Button 
          onClick={runMigration} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Выполняется миграция...
            </>
          ) : (
            <>
              <Database className="mr-2 h-4 w-4" />
              Запустить миграцию
            </>
          )}
        </Button>

        {result && (
          <div className="space-y-3">
            <Alert className={result.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              {result.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription className={result.success ? "text-green-800" : "text-red-800"}>
                {result.message}
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <div className="text-2xl font-bold text-blue-600">{result.stats.total}</div>
                <div className="text-sm text-muted-foreground">Всего записей</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-green-600">{result.stats.updated}</div>
                <div className="text-sm text-muted-foreground">Обновлено</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-red-600">{result.stats.errors}</div>
                <div className="text-sm text-muted-foreground">Ошибок</div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-red-600">Ошибки:</h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {result.errors.map((error, index) => (
                    <div key={index} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
