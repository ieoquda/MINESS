
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GridSize, GameHistoryItem, TileState, GameStatus } from './types';
import { calculateMultiplier, generateMines } from './services/math';
import { audioService } from './services/audio';

const BrandingHeader: React.FC = () => (
  <div className="flex flex-col items-center pt-2 pb-1">
    <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-500 italic tracking-tighter drop-shadow-xl">
      GEMS MINES
    </h1>
  </div>
);

const App: React.FC = () => {
  const [balance, setBalance] = useState(5000);
  const [betAmount, setBetAmount] = useState(100);
  const [minesCount, setMinesCount] = useState(3);
  const [gridSize, setGridSize] = useState(GridSize.LARGE);
  const [status, setStatus] = useState<GameStatus>('idle');
  const [tiles, setTiles] = useState<TileState[]>([]);
  const [mines, setMines] = useState<Set<number>>(new Set());
  const [revealedCount, setRevealedCount] = useState(0);
  const [history, setHistory] = useState<GameHistoryItem[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastWin, setLastWin] = useState<{ amount: number; mult: number } | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  
  // Hidden Feature States
  const [balanceClicks, setBalanceClicks] = useState(0);
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [aClicks, setAClicks] = useState(0);
  const [isPasswordPromptVisible, setIsPasswordPromptVisible] = useState(false);
  const [isCheatVisible, setIsCheatVisible] = useState(false);
  
  const resetTimerRef = useRef<number | null>(null);
  const TOTAL_TILES = gridSize * gridSize;
  const currentMultiplier = calculateMultiplier(TOTAL_TILES, minesCount, revealedCount);
  const isInsufficient = betAmount > balance || betAmount <= 0;

  useEffect(() => {
    audioService.setEnabled(soundEnabled);
  }, [soundEnabled]);

  const initGame = useCallback(() => {
    if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    const newTiles: TileState[] = Array.from({ length: TOTAL_TILES }, (_, i) => ({
      index: i,
      isRevealed: false,
      isMine: false
    }));
    setTiles(newTiles);
    setRevealedCount(0);
    setMines(new Set());
    setLastWin(null);
    setStatus('idle');
  }, [TOTAL_TILES]);

  useEffect(() => {
    initGame();
  }, [initGame, gridSize]);

  const handleStartGame = () => {
    if (status !== 'idle') return;
    if (isInsufficient) return;
    if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    
    audioService.playClick();
    setBalance(prev => prev - betAmount);
    const newMines = generateMines(TOTAL_TILES, minesCount);
    setMines(newMines);
    setStatus('playing');
    setRevealedCount(0);
    setTiles(prev => prev.map(t => ({ ...t, isRevealed: false, isMine: false })));
    setLastWin(null);
  };

  const handleTileClick = (index: number) => {
    if (status !== 'playing') return;
    if (tiles[index].isRevealed) return;

    const isMine = mines.has(index);
    if (isMine) {
      audioService.playMine();
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      if (window.navigator.vibrate) window.navigator.vibrate([300, 100, 300]);
      setStatus('ended');
      setTiles(prev => prev.map((t, i) => ({
        ...t,
        isRevealed: true,
        isMine: mines.has(i)
      })));
      addToHistory(false, 0, 0);
      resetTimerRef.current = window.setTimeout(() => initGame(), 3000);
    } else {
      audioService.playReveal();
      if (window.navigator.vibrate) window.navigator.vibrate(50);
      setTiles(prev => {
        const next = [...prev];
        next[index] = { ...next[index], isRevealed: true };
        return next;
      });
      setRevealedCount(prev => prev + 1);
      if (revealedCount + 1 === TOTAL_TILES - minesCount) {
        handleCashout(calculateMultiplier(TOTAL_TILES, minesCount, revealedCount + 1));
      }
    }
  };

  const handleCashout = (specificMult?: number) => {
    if (status !== 'playing' || revealedCount === 0) return;
    const mult = specificMult || currentMultiplier;
    const payout = betAmount * mult;

    audioService.playCashout();
    audioService.playWin();
    setBalance(prev => prev + payout);
    setStatus('ended');
    setLastWin({ amount: payout, mult: mult });
    setTiles(prev => prev.map((t, i) => ({
      ...t,
      isRevealed: true,
      isMine: mines.has(i)
    })));
    addToHistory(true, mult, payout);
    resetTimerRef.current = window.setTimeout(() => initGame(), 2000);
  };

  const handleBalanceClick = () => {
    const nextCount = balanceClicks + 1;
    setBalanceClicks(nextCount);
    if (nextCount >= 3) {
      setIsEditingBalance(true);
      setBalanceClicks(0);
    }
    setTimeout(() => setBalanceClicks(0), 2000);
  };

  const handleAClick = () => {
    const nextCount = aClicks + 1;
    setAClicks(nextCount);
    if (nextCount >= 7) {
      setIsPasswordPromptVisible(true);
      setAClicks(0);
      audioService.playReveal();
    }
    setTimeout(() => setAClicks(0), 2500);
  };

  const handleDeposit = () => {
    audioService.playClick();
    setBalance(prev => prev + 1000);
  };

  const addToHistory = (won: boolean, multiplier: number, payout: number) => {
    const newItem: GameHistoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      bet: betAmount,
      mines: minesCount,
      multiplier,
      payout,
      won
    };
    setHistory(prev => [newItem, ...prev].slice(0, 10));
  };

  return (
    <div className="h-screen w-full flex flex-col bg-[#020617] max-w-[480px] mx-auto relative shadow-2xl overflow-hidden border-x border-blue-900/20">
      
      {/* A Button - Hidden Entry for Predictor (7 clicks) */}
      <button 
        onClick={handleAClick}
        className="absolute top-4 left-4 w-12 h-12 flex items-center justify-center text-sm font-black text-blue-400 bg-blue-500/10 rounded-full border-2 border-blue-400/30 transition-all z-[60] active:scale-90 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
      >
        A
      </button>

      <BrandingHeader />

      <main className={`flex-1 flex flex-col items-center px-4 space-y-2 justify-between pb-4 ${isShaking ? 'screen-shake' : ''}`}>
        
        {/* Balance Pill */}
        <div className="w-full flex justify-center">
          <div 
            onClick={handleBalanceClick}
            className="bg-slate-900 border border-blue-900/40 rounded-full py-1.5 pl-5 pr-1.5 flex items-center gap-4 shadow-lg cursor-pointer"
          >
             <div className="flex flex-col min-w-[80px]">
               <span className="text-[8px] text-blue-400 font-black uppercase tracking-widest leading-none">Balance</span>
               {isEditingBalance ? (
                 <input 
                  autoFocus
                  type="number"
                  className="bg-transparent border-none outline-none text-white font-bold text-sm w-full p-0"
                  defaultValue={balance}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setBalance(parseInt((e.target as HTMLInputElement).value) || 0);
                      setIsEditingBalance(false);
                    }
                  }}
                  onBlur={(e) => {
                    setBalance(parseInt(e.target.value) || 0);
                    setIsEditingBalance(false);
                  }}
                 />
               ) : (
                <span className="text-sm font-bold text-white tracking-tight">NPR {balance.toLocaleString('en-NP')}</span>
               )}
             </div>
             <button 
              onClick={(e) => { e.stopPropagation(); handleDeposit(); }}
              className="w-8 h-8 bg-green-500 hover:bg-green-400 rounded-full flex items-center justify-center text-white shadow-md active:scale-90 transition-transform"
             >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
             </button>
          </div>
        </div>

        {/* Grid Area */}
        <div className="w-[82%] flex-shrink-0">
          <div className="grid-frame p-2.5 rounded-2xl relative w-full aspect-square flex items-center justify-center">
            <div className={`grid gap-1.5 w-full h-full ${gridSize === 3 ? 'grid-cols-3' : 'grid-cols-5'}`}>
              {tiles.map((tile, i) => (
                <Tile 
                  key={i}
                  tile={tile}
                  disabled={status !== 'playing'}
                  onClick={() => handleTileClick(i)}
                  gridSize={gridSize}
                />
              ))}
            </div>

            {/* Win Overlay */}
            {lastWin && (
               <div className="absolute inset-0 bg-black/90 backdrop-blur-lg z-30 flex flex-col items-center justify-center rounded-2xl border-4 border-green-500/20 animate-in zoom-in duration-300">
                  <div className="bg-green-500 text-white px-4 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-3 animate-bounce">Victory</div>
                  <div className="text-green-400 text-3xl font-black mb-1 drop-shadow-[0_0_15px_rgba(74,222,128,0.7)] text-center px-4 leading-tight">
                    YOU WON at {lastWin.mult}x
                  </div>
                  <div className="text-white text-base font-black tracking-tight opacity-90">
                    NPR {lastWin.amount.toFixed(0)}
                  </div>
               </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="w-full grid grid-cols-3 gap-2 px-2">
            <StatsCard label="Found" value={`${revealedCount}/${TOTAL_TILES - minesCount}`} />
            <StatsCard label="Return" value={`${currentMultiplier}x`} highlight={status === 'playing' && revealedCount > 0} />
            <StatsCard label="Mines" value={minesCount} />
        </div>

        {/* Controls */}
        <div className="w-full space-y-3">
            <div className="w-full relative">
              {status === 'playing' ? (
                <button 
                  onClick={() => handleCashout()}
                  disabled={revealedCount === 0}
                  className={`w-full py-4 rounded-xl font-black text-lg tracking-tight uppercase transition-all cashout-btn text-white disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed`}
                >
                  {revealedCount === 0 ? 'PICK A TILE' : `CASHOUT NPR ${(betAmount * currentMultiplier).toFixed(0)}`}
                </button>
              ) : (
                <div className="relative">
                  {isInsufficient && betAmount > 0 && (
                    <div className="absolute -top-5 left-0 w-full text-center">
                      <span className="text-[10px] font-black text-red-500 uppercase tracking-widest animate-pulse">Insufficient Balance</span>
                    </div>
                  )}
                  <button 
                    onClick={handleStartGame}
                    disabled={isInsufficient}
                    className="w-full py-4 rounded-xl font-black text-lg tracking-tight uppercase text-white premium-btn"
                  >
                    BET NOW
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-stretch gap-2">
              <div className={`flex-1 bg-[#0a1120] border ${isInsufficient && betAmount > 0 ? 'border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.1)]' : 'border-blue-900/40'} rounded-xl px-4 py-1.5 flex flex-col justify-center transition-all`}>
                  <span className="text-[9px] text-blue-500 font-black uppercase tracking-widest mb-0.5 opacity-60">Bet Amount</span>
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center flex-1">
                      <span className="text-white font-black text-sm mr-1">NPR</span>
                      <input 
                        type="number"
                        value={betAmount === 0 ? '' : betAmount}
                        onChange={(e) => {
                          const val = e.target.value === '' ? 0 : parseInt(e.target.value);
                          if (!isNaN(val)) setBetAmount(val);
                        }}
                        disabled={status === 'playing'}
                        className="bet-input-field"
                        placeholder="0"
                      />
                    </div>
                    <div className="flex gap-1.5">
                        <button onClick={() => setBetAmount(prev => Math.max(0, prev - 50))} disabled={status==='playing'} className="w-6 h-6 rounded bg-blue-900/40 text-blue-400 font-black border border-blue-500/20 active:scale-90">-</button>
                        <button onClick={() => setBetAmount(prev => prev + 50)} disabled={status==='playing'} className="w-6 h-6 rounded bg-blue-900/40 text-blue-400 font-black border border-blue-500/20 active:scale-90">+</button>
                    </div>
                  </div>
              </div>
              
              <div className="bg-[#0a1120] border border-blue-900/40 rounded-xl px-3 py-1.5 flex flex-col justify-center">
                  <span className="text-[9px] text-blue-500 font-black uppercase tracking-widest mb-1 opacity-60">Mines</span>
                  <div className="flex gap-1">
                     {[3, 5, 10].map(m => (
                        <button 
                          key={m}
                          disabled={status === 'playing'}
                          onClick={() => setMinesCount(m)}
                          className={`w-6 h-6 flex-shrink-0 rounded text-[10px] font-black transition-all ${minesCount === m ? 'bg-blue-600 text-white shadow-lg' : 'bg-blue-900/20 text-blue-400'}`}
                        >
                          {m}
                        </button>
                     ))}
                  </div>
              </div>

              <button 
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`w-11 rounded-xl border-2 flex items-center justify-center transition-all ${soundEnabled ? 'border-blue-500/30 text-blue-400 bg-blue-500/5' : 'border-gray-800 text-gray-700'}`}
              >
                 {soundEnabled ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                 ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                 )}
              </button>
            </div>
        </div>
      </main>

      <div className="h-8 bg-black/40 border-t border-blue-900/30 px-6 flex items-center gap-2 overflow-x-auto z-40">
        {history.length === 0 ? (
          <span className="text-[7px] text-gray-700 font-black uppercase tracking-[0.5em] w-full text-center">Place your bet to start</span>
        ) : (
          history.map(item => (
            <div key={item.id} className={`flex-shrink-0 px-2 py-0.5 rounded text-[7px] font-black ${item.won ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-500'}`}>
              {item.won ? `${item.multiplier}x` : 'BOOM'}
            </div>
          ))
        )}
      </div>

      {/* Hidden Windows */}
      {isPasswordPromptVisible && (
        <PasswordPromptWindow 
          onSuccess={() => {
            setIsPasswordPromptVisible(false);
            setIsCheatVisible(true);
            audioService.playWin();
          }}
          onClose={() => setIsPasswordPromptVisible(false)}
        />
      )}

      {isCheatVisible && (
        <CheatWindow 
          mines={mines} 
          gridSize={gridSize} 
          onClose={() => setIsCheatVisible(false)} 
        />
      )}
    </div>
  );
};

const PasswordPromptWindow: React.FC<{ onSuccess: () => void; onClose: () => void }> = ({ onSuccess, onClose }) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [pos, setPos] = useState({ x: 40, y: 150 });
  const [isDragging, setIsDragging] = useState(false);
  const startRef = useRef({ x: 0, y: 0, startPos: { x: 0, y: 0 } });

  const onStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    startRef.current = { x: clientX, y: clientY, startPos: { ...pos } };
  };

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const dx = clientX - startRef.current.x;
      const dy = clientY - startRef.current.y;
      setPos({ x: startRef.current.startPos.x + dx, y: startRef.current.startPos.y + dy });
    };
    const onEnd = () => setIsDragging(false);
    if (isDragging) {
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onEnd);
      window.addEventListener('touchmove', onMove, { passive: false });
      window.addEventListener('touchend', onEnd);
    }
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isDragging]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === "8848848848") {
      onSuccess();
    } else {
      setError(true);
      setTimeout(() => setError(false), 500);
      audioService.playMine();
      setPin("");
    }
  };

  return (
    <div 
      className={`fixed z-[1200] bg-[#0a1120]/95 border-2 ${error ? 'border-red-500' : 'border-blue-500/50'} rounded-3xl backdrop-blur-3xl flex flex-col shadow-[0_40px_80px_rgba(0,0,0,0.9)] overflow-hidden w-[280px] select-none transition-colors duration-300`}
      style={{ left: pos.x, top: pos.y }}
    >
      <div 
        onMouseDown={(e) => onStart(e.clientX, e.clientY)}
        onTouchStart={(e) => onStart(e.touches[0].clientX, e.touches[0].clientY)}
        className="h-12 bg-blue-950/60 border-b border-blue-500/20 px-5 flex items-center justify-between cursor-move shrink-0"
      >
        <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Security Check</span>
        <button onClick={onClose} className="text-red-400 hover:text-red-300 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-3 border border-blue-500/30">
            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <p className="text-[11px] font-bold text-white uppercase tracking-wider mb-4 opacity-80">Enter Authorization PIN</p>
        </div>
        <input 
          autoFocus
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="w-full bg-[#1e293b] border border-blue-900/40 rounded-xl px-4 py-3 text-white font-black text-center tracking-[0.5em] outline-none focus:border-blue-500 transition-all placeholder:text-blue-900/40"
          placeholder="••••••••"
        />
        <button 
          type="submit"
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
        >
          Authorize
        </button>
      </form>
    </div>
  );
};

const CheatWindow: React.FC<{ mines: Set<number>, gridSize: number, onClose: () => void }> = ({ mines, gridSize, onClose }) => {
  const [pos, setPos] = useState({ x: 40, y: 80 });
  const [size, setSize] = useState({ w: 220, h: 280 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const startRef = useRef({ x: 0, y: 0, startPos: { x: 0, y: 0 }, startSize: { w: 0, h: 0 } });

  const onStart = (clientX: number, clientY: number) => {
    setIsDragging(true);
    startRef.current = { x: clientX, y: clientY, startPos: { ...pos }, startSize: { ...size } };
  };

  const onResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsResizing(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    startRef.current = { x: clientX, y: clientY, startPos: { ...pos }, startSize: { ...size } };
    e.stopPropagation();
    e.preventDefault();
  };

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging && !isResizing) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const dx = clientX - startRef.current.x;
      const dy = clientY - startRef.current.y;

      if (isDragging) {
        setPos({ 
          x: startRef.current.startPos.x + dx, 
          y: startRef.current.startPos.y + dy 
        });
      }
      if (isResizing) {
        setSize({ 
          w: Math.max(160, startRef.current.startSize.w + dx), 
          h: Math.max(180, startRef.current.startSize.h + dy) 
        });
      }
    };
    const onEnd = () => { 
      setIsDragging(false); 
      setIsResizing(false); 
    };
    
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onEnd);
      window.addEventListener('touchmove', onMove, { passive: false });
      window.addEventListener('touchend', onEnd);
    }
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isDragging, isResizing]);

  return (
    <div 
      className="fixed z-[1000] bg-[#0a1120]/90 border-2 border-cyan-400/50 rounded-3xl backdrop-blur-3xl flex flex-col shadow-[0_30px_60px_rgba(0,0,0,0.9)] overflow-hidden select-none"
      style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
    >
      <div 
        onMouseDown={(e) => onStart(e.clientX, e.clientY)}
        onTouchStart={(e) => onStart(e.touches[0].clientX, e.touches[0].clientY)}
        className="h-12 bg-cyan-950/60 border-b border-cyan-400/20 px-5 flex items-center justify-between cursor-move shrink-0"
      >
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_8px_#22d3ee]" />
          <span className="text-[11px] font-black text-cyan-400 uppercase tracking-[0.2em]">Mine Locator</span>
        </div>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-red-500/10 hover:bg-red-500/30 rounded-full transition-all text-red-400">
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="flex-1 p-4 flex items-center justify-center overflow-hidden bg-black/60">
        <div 
          className="grid gap-2 w-full h-full max-w-full max-h-full" 
          style={{ gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`, aspectRatio: '1/1' }}
        >
          {Array.from({ length: gridSize * gridSize }).map((_, i) => (
            <div key={i} className="aspect-square rounded-lg border border-white/10 bg-white/5 flex items-center justify-center relative overflow-hidden">
              {mines.has(i) ? (
                <div className="w-3 h-3 bg-red-500 rounded-full shadow-[0_0_12px_#ef4444] animate-pulse" />
              ) : (
                <div className="w-3 h-3 bg-green-500 rounded-full shadow-[0_0_12px_#22c55e] opacity-70" />
              )}
            </div>
          ))}
        </div>
      </div>
      <div 
        onMouseDown={onResizeStart} 
        onTouchStart={onResizeStart} 
        className="absolute bottom-1 right-1 w-8 h-8 cursor-se-resize flex items-center justify-center z-10 group"
      >
        <div className="w-3 h-3 border-r-2 border-b-2 border-cyan-400/40 rounded-br-sm group-hover:border-cyan-400 transition-colors" />
      </div>
    </div>
  );
};

const Tile: React.FC<{ 
  tile: TileState; 
  disabled: boolean; 
  onClick: () => void;
  gridSize: number;
}> = ({ tile, disabled, onClick }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled || tile.isRevealed}
      className={`
        w-full h-full rounded-xl relative transition-all duration-300 transform perspective-1000
        ${tile.isRevealed 
          ? (tile.isMine ? 'bg-red-500/25 border-red-500/40' : 'bg-cyan-400/5 border-cyan-400/20') 
          : 'bg-[#1e293b] border-[#334155] border-2 shadow-[0_4px_0_#0f172a] hover:bg-[#2d3a4f] active:scale-95'}
        group
      `}
    >
      <div className="absolute inset-0 flex items-center justify-center overflow-visible">
        {tile.isRevealed && (
          tile.isMine ? (
            <div className="flex flex-col items-center blast-effect">
              <svg className="w-9 h-9 text-red-500 drop-shadow-[0_0_20px_#ef4444]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z" />
              </svg>
              {[...Array(12)].map((_, i) => (
                <div 
                  key={i} 
                  className="debris" 
                  style={{
                    '--tw-translate-x': `${(Math.random() - 0.5) * 120}px`,
                    '--tw-translate-y': `${(Math.random() - 0.5) * 120}px`,
                    'animation-delay': `${Math.random() * 0.1}s`
                  } as any} 
                />
              ))}
              <div className="absolute w-16 h-16 bg-red-600/20 blur-2xl rounded-full animate-ping" />
            </div>
          ) : (
            <div className="diamond-glow safe-pop">
               <svg className="w-8 h-8 text-cyan-300 drop-shadow-[0_0_12px_#22d3ee]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L4.5 9l7.5 13 7.5-13L12 2zM7.1 9l4.9-4.5 4.9 4.5H7.1z" />
               </svg>
            </div>
          )
        )}
      </div>
      {!tile.isRevealed && !disabled && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-xl" />
      )}
    </button>
  );
};

const StatsCard: React.FC<{ label: string; value: string | number; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div className={`bg-slate-900 border border-blue-900/30 rounded-xl py-1 px-2 flex flex-col items-center justify-center transition-all duration-500 ${highlight ? 'border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.1)]' : ''}`}>
    <span className="text-[7px] text-blue-500 font-black uppercase tracking-widest opacity-60 leading-none mb-0.5">{label}</span>
    <span className={`text-[10px] font-black text-white leading-none ${highlight ? 'text-cyan-400' : ''}`}>{value}</span>
  </div>
);

export default App;
