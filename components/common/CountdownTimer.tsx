import React, { useState, useEffect, useMemo } from 'react';

interface CountdownTimerProps {
  targetDate: string; // ISO string
  className?: string;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ targetDate, className }) => {
  const calculateTimeLeft = (target: Date) => {
    const difference = target.getTime() - new Date().getTime();
    let timeLeft = {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    };

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }
    return { timeLeft, difference };
  };

  const targetDateObject = useMemo(() => {
    try {
      return new Date(targetDate);
    } catch (e) {
      return null;
    }
  }, [targetDate]);

  const [initialCalculation, setInitialCalculation] = useState(() => {
      if (!targetDateObject || isNaN(targetDateObject.getTime())) return { timeLeft: null, difference: -1 };
      return calculateTimeLeft(targetDateObject);
  });
  
  const [timeLeft, setTimeLeft] = useState(initialCalculation.timeLeft);
  const [hasEnded, setHasEnded] = useState(initialCalculation.difference <= 0);


  useEffect(() => {
    if (!targetDateObject || isNaN(targetDateObject.getTime()) || hasEnded) {
      return;
    }

    const timer = setInterval(() => {
      const { timeLeft: newTimeLeft, difference } = calculateTimeLeft(targetDateObject);
      setTimeLeft(newTimeLeft);
      if (difference <= 0) {
        setHasEnded(true);
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDateObject, hasEnded]);

  if (!targetDateObject || isNaN(targetDateObject.getTime())) {
    return <span className={`text-xs text-yellow-400 ${className}`}>Invalid date</span>;
  }

  if (hasEnded) {
    return <span className={`text-sm font-semibold text-red-400 animate-pulse ${className}`}>Starting Soon!</span>;
  }

  if (!timeLeft) {
    return <span className={`text-xs text-gray-500 ${className}`}>Calculating...</span>;
  }

  return (
    <div className={`text-center tabular-nums ${className}`}>
      <span className="text-xs text-gray-400 block mb-0.5">Countdown:</span>
      <div className="flex justify-center space-x-2 text-sm font-medium">
        {timeLeft.days > 0 && (
          <div className="flex flex-col items-center">
            <span className="text-lg text-[var(--theme-accent)]">{String(timeLeft.days).padStart(2, '0')}</span>
            <span className="text-xs text-gray-500">Days</span>
          </div>
        )}
        <div className="flex flex-col items-center">
          <span className="text-lg text-[var(--theme-accent)]">{String(timeLeft.hours).padStart(2, '0')}</span>
          <span className="text-xs text-gray-500">Hrs</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-lg text-[var(--theme-accent)]">{String(timeLeft.minutes).padStart(2, '0')}</span>
          <span className="text-xs text-gray-500">Min</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-lg text-[var(--theme-accent)]">{String(timeLeft.seconds).padStart(2, '0')}</span>
          <span className="text-xs text-gray-500">Sec</span>
        </div>
      </div>
    </div>
  );
};

export default CountdownTimer;
