"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Clock } from 'lucide-react'

interface CountdownProps {
    targetTime: string; // Format "HH:MM"
    onStatusChange?: (status: 'green' | 'orange' | 'red') => void;
}

export function Countdown({ targetTime, onStatusChange }: CountdownProps) {
    const [timeLeft, setTimeLeft] = useState<string>('')
    const [statusColor, setStatusColor] = useState<string>('text-muted-foreground')
    const [isUrgent, setIsUrgent] = useState(false)
    const onStatusChangeRef = useRef(onStatusChange)
    const lastStatusRef = useRef<'green' | 'orange' | 'red' | null>(null)

    useEffect(() => {
        onStatusChangeRef.current = onStatusChange
    }, [onStatusChange])

    useEffect(() => {
        const calculateTimeLeft = () => {
            const now = new Date()
            const [targetHours, targetMinutes] = targetTime.split(':').map(Number)

            const targetDate = new Date(now)
            targetDate.setHours(targetHours, targetMinutes, 0, 0)

            // If target time is earlier today, it might be for tomorrow (though in this app we filter past buses usually)
            // But let's assume it's today for simplicity as per current logic
            if (targetDate.getTime() < now.getTime()) {
                // If it's already passed, maybe show "Departed" or similar?
                // But the main logic filters out past buses. 
                // Let's just handle the case where it's very close or just passed.
                return { diff: targetDate.getTime() - now.getTime(), passed: true }
            }

            return { diff: targetDate.getTime() - now.getTime(), passed: false }
        }

        const update = () => {
            const { diff, passed } = calculateTimeLeft()
            let nextStatus: 'green' | 'orange' | 'red'

            if (passed || diff < 0) {
                setTimeLeft('Ara')
                setStatusColor('text-red-500')
                setIsUrgent(true)
                nextStatus = 'red'
            } else {
                const minutes = Math.floor(diff / 60000)
                const hours = Math.floor(minutes / 60)
                const remainingMinutes = minutes % 60

                if (hours > 0) {
                    setTimeLeft(`${hours}h ${remainingMinutes} min`)
                    setStatusColor('text-green-600 dark:text-green-400')
                    setIsUrgent(false)
                    nextStatus = 'green'
                } else {
                    setTimeLeft(`${minutes} min`)
                    if (minutes < 5) {
                        setStatusColor('text-red-500 font-bold animate-pulse')
                        setIsUrgent(true)
                        nextStatus = 'red'
                    } else if (minutes < 10) {
                        setStatusColor('text-orange-500 font-semibold')
                        setIsUrgent(false)
                        nextStatus = 'orange'
                    } else {
                        setStatusColor('text-green-600 dark:text-green-400')
                        setIsUrgent(false)
                        nextStatus = 'green'
                    }
                }
            }

            if (lastStatusRef.current !== nextStatus) {
                lastStatusRef.current = nextStatus
                onStatusChangeRef.current?.(nextStatus)
            }
        }

        update() // Initial call
        const interval = setInterval(update, 10000) // Update every 10 seconds

        return () => clearInterval(interval)
    }, [targetTime])

    return (
        <div className={`flex items-center gap-2 ${statusColor}`}>
            {isUrgent && <Clock className="h-4 w-4 animate-pulse" />}
            <span className="text-lg font-bold tabular-nums tracking-tight">{timeLeft}</span>
        </div>
    )
}
