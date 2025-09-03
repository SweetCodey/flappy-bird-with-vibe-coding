import { useState, useEffect, useRef, useCallback } from 'react'
import './FlappyBird.css'

const GAME_CONFIG = {
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 400,
  BIRD_SIZE: 20,
  BIRD_X: 50,
  PIPE_WIDTH: 80,
  PIPE_GAP: 150,
  PIPE_SPEED: 2,
  GRAVITY: 0.6,
  JUMP_FORCE: -12,
  SPAWN_RATE: 90
}

const GAME_STATES = {
  START: 'start',
  PLAYING: 'playing',
  GAME_OVER: 'gameOver'
}

function FlappyBird() {
  const canvasRef = useRef(null)
  const gameLoopRef = useRef(null)
  const [gameState, setGameState] = useState(GAME_STATES.START)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem('flappyBirdHighScore') || '0')
  })

  // Game objects
  const gameObjects = useRef({
    bird: {
      y: GAME_CONFIG.CANVAS_HEIGHT / 2,
      velocity: 0
    },
    pipes: [],
    frameCount: 0
  })

  // Update canvas size to maintain aspect ratio
  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const container = canvas.parentElement
    const containerWidth = container.clientWidth
    const aspectRatio = GAME_CONFIG.CANVAS_WIDTH / GAME_CONFIG.CANVAS_HEIGHT
    
    let canvasWidth = Math.min(containerWidth - 20, GAME_CONFIG.CANVAS_WIDTH)
    let canvasHeight = canvasWidth / aspectRatio

    canvas.style.width = `${canvasWidth}px`
    canvas.style.height = `${canvasHeight}px`
    
    // Set internal resolution
    canvas.width = GAME_CONFIG.CANVAS_WIDTH
    canvas.height = GAME_CONFIG.CANVAS_HEIGHT
  }, [])

  const jump = useCallback(() => {
    if (gameState === GAME_STATES.START) {
      setGameState(GAME_STATES.PLAYING)
      gameObjects.current.bird.velocity = GAME_CONFIG.JUMP_FORCE
    } else if (gameState === GAME_STATES.PLAYING) {
      gameObjects.current.bird.velocity = GAME_CONFIG.JUMP_FORCE
    } else if (gameState === GAME_STATES.GAME_OVER) {
      // Restart game
      setGameState(GAME_STATES.START)
      setScore(0)
      gameObjects.current = {
        bird: {
          y: GAME_CONFIG.CANVAS_HEIGHT / 2,
          velocity: 0
        },
        pipes: [],
        frameCount: 0
      }
    }
  }, [gameState])

  const checkCollision = useCallback(() => {
    const bird = gameObjects.current.bird
    const birdTop = bird.y - GAME_CONFIG.BIRD_SIZE / 2
    const birdBottom = bird.y + GAME_CONFIG.BIRD_SIZE / 2
    const birdLeft = GAME_CONFIG.BIRD_X - GAME_CONFIG.BIRD_SIZE / 2
    const birdRight = GAME_CONFIG.BIRD_X + GAME_CONFIG.BIRD_SIZE / 2

    // Check ground and ceiling collision
    if (birdTop <= 0 || birdBottom >= GAME_CONFIG.CANVAS_HEIGHT) {
      return true
    }

    // Check pipe collision
    for (const pipe of gameObjects.current.pipes) {
      if (birdRight > pipe.x && birdLeft < pipe.x + GAME_CONFIG.PIPE_WIDTH) {
        if (birdTop < pipe.topHeight || birdBottom > pipe.topHeight + GAME_CONFIG.PIPE_GAP) {
          return true
        }
      }
    }

    return false
  }, [])

  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const { bird, pipes } = gameObjects.current

    // Clear canvas
    ctx.fillStyle = '#87CEEB'
    ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT)

    if (gameState === GAME_STATES.PLAYING) {
      // Update bird physics
      bird.velocity += GAME_CONFIG.GRAVITY
      bird.y += bird.velocity

      // Spawn pipes
      if (gameObjects.current.frameCount % GAME_CONFIG.SPAWN_RATE === 0) {
        const topHeight = Math.random() * (GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.PIPE_GAP - 100) + 50
        pipes.push({
          x: GAME_CONFIG.CANVAS_WIDTH,
          topHeight,
          scored: false
        })
      }

      // Update pipes
      for (let i = pipes.length - 1; i >= 0; i--) {
        const pipe = pipes[i]
        pipe.x -= GAME_CONFIG.PIPE_SPEED

        // Remove off-screen pipes
        if (pipe.x + GAME_CONFIG.PIPE_WIDTH < 0) {
          pipes.splice(i, 1)
        }

        // Score when bird passes pipe
        if (!pipe.scored && pipe.x + GAME_CONFIG.PIPE_WIDTH < GAME_CONFIG.BIRD_X) {
          pipe.scored = true
          setScore(prevScore => prevScore + 1)
        }
      }

      // Check collisions
      if (checkCollision()) {
        setGameState(GAME_STATES.GAME_OVER)
        if (score > highScore) {
          setHighScore(score)
          localStorage.setItem('flappyBirdHighScore', score.toString())
        }
      }

      gameObjects.current.frameCount++
    }

    // Draw pipes
    ctx.fillStyle = '#228B22'
    for (const pipe of pipes) {
      // Top pipe
      ctx.fillRect(pipe.x, 0, GAME_CONFIG.PIPE_WIDTH, pipe.topHeight)
      // Bottom pipe
      ctx.fillRect(
        pipe.x,
        pipe.topHeight + GAME_CONFIG.PIPE_GAP,
        GAME_CONFIG.PIPE_WIDTH,
        GAME_CONFIG.CANVAS_HEIGHT - pipe.topHeight - GAME_CONFIG.PIPE_GAP
      )
    }

    // Draw bird
    ctx.fillStyle = '#FFD700'
    ctx.beginPath()
    ctx.arc(GAME_CONFIG.BIRD_X, bird.y, GAME_CONFIG.BIRD_SIZE / 2, 0, Math.PI * 2)
    ctx.fill()

    // Draw score
    ctx.fillStyle = '#000'
    ctx.font = '24px Arial'
    ctx.fillText(`Score: ${score}`, 10, 30)

    gameLoopRef.current = requestAnimationFrame(gameLoop)
  }, [gameState, score, highScore, checkCollision])

  useEffect(() => {
    updateCanvasSize()
    
    const handleResize = () => {
      updateCanvasSize()
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [updateCanvasSize])

  useEffect(() => {
    gameLoopRef.current = requestAnimationFrame(gameLoop)
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current)
      }
    }
  }, [gameLoop])

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space') {
        e.preventDefault()
        jump()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [jump])

  return (
    <div className="flappy-bird-container">
      <h1>Flappy Bird Game</h1>
      <div className="game-area">
        <canvas
          ref={canvasRef}
          width={GAME_CONFIG.CANVAS_WIDTH}
          height={GAME_CONFIG.CANVAS_HEIGHT}
          onClick={jump}
          className="game-canvas"
        />
        <div className="game-info">
          <div className="scores">
            <div>Current Score: {score}</div>
            <div>High Score: {highScore}</div>
          </div>
          {gameState === GAME_STATES.START && (
            <div className="game-message">
              <p>Click or press SPACE to start!</p>
            </div>
          )}
          {gameState === GAME_STATES.GAME_OVER && (
            <div className="game-message game-over">
              <p>Game Over!</p>
              <p>Final Score: {score}</p>
              <p>Click or press SPACE to restart</p>
            </div>
          )}
        </div>
      </div>
      <div className="instructions">
        <p>🐦 Control the bird with SPACEBAR or click to jump</p>
        <p>🎯 Avoid the pipes and try to get the highest score!</p>
      </div>
    </div>
  )
}

export default FlappyBird