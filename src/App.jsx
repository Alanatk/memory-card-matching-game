import { useEffect, useMemo, useRef, useState } from "react";

const SYMBOLS = ["🍉", "🚀", "🎧", "🌈", "⚡", "🪐", "🎮", "🧩", "🦊", "🌻", "🎯", "🍓"];

const DIFFICULTIES = {
  easy: { label: "Easy", pairs: 6, columns: 3 },
  medium: { label: "Medium", pairs: 8, columns: 4 },
  hard: { label: "Hard", pairs: 10, columns: 5 }
};

const BEST_SCORE_KEY = "memory-match-best-scores";

function shuffleCards(items) {
  const cards = [...items];

  for (let index = cards.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [cards[index], cards[swapIndex]] = [cards[swapIndex], cards[index]];
  }

  return cards;
}

function createDeck(level) {
  const { pairs } = DIFFICULTIES[level];
  const selectedSymbols = SYMBOLS.slice(0, pairs);
  const deck = selectedSymbols.flatMap((symbol, index) => [
    { id: `${symbol}-${index}-a`, symbol, pairId: symbol, matched: false },
    { id: `${symbol}-${index}-b`, symbol, pairId: symbol, matched: false }
  ]);

  return shuffleCards(deck);
}

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function readBestScores() {
  try {
    const stored = window.localStorage.getItem(BEST_SCORE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export default function App() {
  const [difficulty, setDifficulty] = useState("medium");
  const [cards, setCards] = useState(() => createDeck("medium"));
  const [flippedIds, setFlippedIds] = useState([]);
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [bestScores, setBestScores] = useState(() => readBestScores());

  const timerRef = useRef(null);
  const lockBoard = flippedIds.length === 2;

  const matchedPairs = useMemo(
    () => cards.filter((card) => card.matched).length / 2,
    [cards]
  );

  const totalPairs = DIFFICULTIES[difficulty].pairs;

  useEffect(() => {
    if (gameWon || matchedPairs === 0 && moves === 0 && flippedIds.length === 0) {
      return undefined;
    }

    timerRef.current = window.setInterval(() => {
      setSeconds((currentSeconds) => currentSeconds + 1);
    }, 1000);

    return () => {
      window.clearInterval(timerRef.current);
    };
  }, [gameWon, matchedPairs, moves, flippedIds.length]);

  useEffect(() => {
    if (matchedPairs !== totalPairs) {
      return;
    }

    setGameWon(true);
    window.clearInterval(timerRef.current);

    setBestScores((currentScores) => {
      const currentBest = currentScores[difficulty];
      const updatedBest =
        !currentBest ||
        seconds < currentBest.time ||
        (seconds === currentBest.time && moves < currentBest.moves)
          ? { time: seconds, moves }
          : currentBest;

      const nextScores = { ...currentScores, [difficulty]: updatedBest };
      window.localStorage.setItem(BEST_SCORE_KEY, JSON.stringify(nextScores));
      return nextScores;
    });
  }, [difficulty, matchedPairs, moves, seconds, totalPairs]);

  useEffect(() => {
    if (flippedIds.length !== 2) {
      return undefined;
    }

    const [firstId, secondId] = flippedIds;
    const firstCard = cards.find((card) => card.id === firstId);
    const secondCard = cards.find((card) => card.id === secondId);

    if (!firstCard || !secondCard) {
      return undefined;
    }

    if (firstCard.pairId === secondCard.pairId) {
      const matchDelay = window.setTimeout(() => {
        setCards((currentCards) =>
          currentCards.map((card) =>
            card.pairId === firstCard.pairId ? { ...card, matched: true } : card
          )
        );
        setFlippedIds([]);
      }, 450);

      return () => window.clearTimeout(matchDelay);
    }

    const resetDelay = window.setTimeout(() => {
      setFlippedIds([]);
    }, 900);

    return () => window.clearTimeout(resetDelay);
  }, [cards, flippedIds]);

  function startNewGame(nextDifficulty = difficulty) {
    window.clearInterval(timerRef.current);
    setDifficulty(nextDifficulty);
    setCards(createDeck(nextDifficulty));
    setFlippedIds([]);
    setMoves(0);
    setSeconds(0);
    setGameWon(false);
  }

  function handleCardClick(cardId) {
    if (lockBoard || gameWon) {
      return;
    }

    const selectedCard = cards.find((card) => card.id === cardId);

    if (!selectedCard || selectedCard.matched || flippedIds.includes(cardId)) {
      return;
    }

    setFlippedIds((currentIds) => {
      const nextIds = [...currentIds, cardId];

      if (nextIds.length === 2) {
        setMoves((currentMoves) => currentMoves + 1);
      }

      return nextIds;
    });
  }

  return (
    <main className="app-shell">
      <section className="game-panel">
        <div className="hero">
          <div>
            <h1>Memory Card Matching Game</h1>
            <p className="hero-copy">
              Flip, match, and clear the board with the best time you can manage.
            </p>
          </div>

          <button className="primary-button" onClick={() => startNewGame()}>
            Restart Game
          </button>
        </div>

        <div className="toolbar">
          <div className="difficulty-switcher" aria-label="Select difficulty">
            {Object.entries(DIFFICULTIES).map(([key, option]) => (
              <button
                key={key}
                className={key === difficulty ? "chip active" : "chip"}
                onClick={() => startNewGame(key)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="stats">
            <article className="stat-card">
              <span className="stat-label">Moves</span>
              <strong>{moves}</strong>
            </article>
            <article className="stat-card">
              <span className="stat-label">Timer</span>
              <strong>{formatTime(seconds)}</strong>
            </article>
            <article className="stat-card">
              <span className="stat-label">Matched</span>
              <strong>
                {matchedPairs}/{totalPairs}
              </strong>
            </article>
          </div>
        </div>

        <div className="best-score-banner">
          <span>Best Score</span>
          <strong>
            {bestScores[difficulty]
              ? `${formatTime(bestScores[difficulty].time)} • ${bestScores[difficulty].moves} moves`
              : "Play your first round on this level"}
          </strong>
        </div>

        <div
          className="board"
          style={{ "--columns": DIFFICULTIES[difficulty].columns }}
        >
          {cards.map((card) => {
            const isFlipped = flippedIds.includes(card.id) || card.matched;

            return (
              <button
                key={card.id}
                className={isFlipped ? "memory-card flipped" : "memory-card"}
                onClick={() => handleCardClick(card.id)}
                type="button"
                aria-label={isFlipped ? `Card ${card.symbol}` : "Hidden card"}
              >
                <span className="card-face card-front">?</span>
                <span className="card-face card-back">{card.symbol}</span>
              </button>
            );
          })}
        </div>
      </section>

      {gameWon && (
        <section className="win-overlay" role="dialog" aria-modal="true">
          <div className="win-card">
            <p className="eyebrow">Congratulations!</p>
            <h2>You Won</h2>
            <p>
              You cleared the <strong>{DIFFICULTIES[difficulty].label}</strong> board in{" "}
              <strong>{formatTime(seconds)}</strong> with <strong>{moves} moves</strong>.
            </p>
            <button className="primary-button" onClick={() => startNewGame()}>
              Play Again
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
