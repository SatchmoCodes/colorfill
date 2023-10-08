import { useCallback, useState } from 'react'
import { useEffect } from 'react'
import { json, redirect } from "@remix-run/node";
import gameStyle from '~/styles/game.css'
import generateBoard from './pvpGenerator'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { library } from '@fortawesome/fontawesome-svg-core'
import { Link, useNavigation, useBeforeUnload } from "@remix-run/react";
import { faCheckSquare, faCoffee, faGear } from '@fortawesome/free-solid-svg-icons'

library.add(faCheckSquare, faCoffee, faGear)

import { useUser } from "~/utils";
import { requireUserId } from "~/session.server";
import { Form, useActionData, useLoaderData} from '@remix-run/react'
import { createBoard} from '~/models/board.server'
import { createScore} from '~/models/score.server'
import invariant from "tiny-invariant";

import { Beforeunload, useBeforeunload } from 'react-beforeunload';

import { emitter } from "../services/emitter.server";
import { useEventSource } from "remix-utils";

import { useFetcher } from "@remix-run/react";
import { getGameSessionById, updateBoardStateOwner, updateBoardStateOpponent } from '../models/gamesession.server';

export const HeadersFunction = () => {
  const headers = new Headers()
  headers.set("Server", "Remix")
  return headers
}


export const loader = async ({ params, request }) => {
  const userId = await requireUserId(request);
  invariant(params.sessionId, "sessionId not found");

  const gameSession = await getGameSessionById({ id: params.sessionId });
  if (!gameSession) {
    throw new Response("Not Found", { status: 404 });
  }
  let squareData = JSON.parse(gameSession.boardState)
  squareData = squareData.flat()
  let squareGrowth = JSON.parse(gameSession.squareGrowth)
  
  return json({ gameSession, squareData, squareGrowth });
  
};


export const action = async ({ request }) => {
  const userId = await requireUserId(request)

  const formData = await request.formData()
  const submitType = formData.get('submitType')
  const sessionId = formData.get('sessionId')

  if (submitType == 'boardUpdate') {
    const boardState = formData.get('boardState')
    const squareGrowth = formData.get('squareGrowth')
    const turn = formData.get('turn')
    const captured = parseInt(formData.get('captured'))
    console.log(turn)
    console.log(captured)
    if (turn == 'Owner') {
      const updatedGameSession = await updateBoardStateOpponent({ id: sessionId, boardState, squareGrowth, turn, opponentScore: captured})
      emitter.emit('updateBoard-gameSession', JSON.stringify(updatedGameSession))
    }
    else {
      const updatedGameSession = await updateBoardStateOwner({ id: sessionId, boardState, squareGrowth, turn, ownerScore: captured})
      emitter.emit('updateBoard-gameSession', JSON.stringify(updatedGameSession))
    }
  }
  return null
}

const paletteColors = ['--red', '--orange', '--yellow', '--green', '--blue', '--owner', '--opponent']
let totalCaptured = 0
let turnCount = 0
// let boardSize = 20
// let totalDim = 400

// let data.squareData = generateBoard(boardSize).flat()
let squareCounterArr = [
  {
    id: 0,
    color: 'var(--red)',
    count: 0
  },
  {
    id: 1,
    color: 'var(--orange)',
    count: 0
  },
  {
    id: 2,
    color: 'var(--yellow)',
    count: 0
  },
  {
    id: 3,
    color: 'var(--green)',
    count: 0
  },
  {
    id: 4,
    color: 'var(--blue)',
    count: 0
  }
]


// let data.squareGrowth = new Array(totalDim).fill(false)



let tempSquareArr
let turnLogArr = []
let turnLogJSON
let boardStateJSON
let numberCaptured = 0
let hasRun = false
let currentPlayer
let roundCaptured = 0

function App() {
  const user = useUser()
  const fetcher = useFetcher()
  const data = useLoaderData()
  const navigation = useNavigation()

  const isSubmitting = navigation.formAction === '/game'

  const [count, setCount] = useState(turnCount) //track # of turns
  const [colorState, setColorState] = useState(data.squareData) //tracks color of entire board
  const [squareCounter, setSquareCounter] = useState(squareCounterArr) //sets number of squares left
  const [highScore, setHighScore] = useState(data.bestScore == null ? '' : data.bestScore.score)
  const [selectedColor, setSelectedColor] = useState(data.squareData[0].color) //sets selected color at bottom
  const [saveActive, setSaveActive] = useState(false)
  const [radarActive, setRadarActive] = useState(false)
  const [growth, setGrowth] = useState(data.squareGrowth) //class animation on capture
  const [customBoardSize, setCustomBoardSize] = useState('')
  const [boardSize, setBoardSize] = useState(Math.sqrt(data.squareData.length))
  const [newBoardSize, setNewBoardSize] = useState(Math.sqrt(data.squareData.length))
  const [grid, setGrid] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [complete, setComplete] = useState(false)

  const [turnLog, setTurnLog] = useState(turnLogArr)
  const [ownerScore, setOwnerScore] = useState(data.gameSession.ownerScore)
  const [opponentScore, setOpponentScore] = useState(data.gameSession.opponentScore)


  let boardUpdate = useEventSource('/pvpgame/subscribe', {event: 'updateBoard-gameSession'})

  useBeforeUnload(
    useCallback(() => {
      alert('hi')
    })
  )

  useEffect(() => {
    if (boardUpdate) {
      let parsedBoardUpdate = JSON.parse(boardUpdate)
      if (parsedBoardUpdate != null) {
        let totalSquares = data.squareData.length
        // setGrowth(JSON.parse(parsedBoardUpdate.squareGrowth))
        data.squareGrowth = JSON.parse(parsedBoardUpdate.squareGrowth)
        setColorState(JSON.parse(parsedBoardUpdate.boardState))
        tempSquareArr = JSON.parse(parsedBoardUpdate.boardState)
        data.gameSession.turn = parsedBoardUpdate.turn
        data.squareData = tempSquareArr
        parsedBoardUpdate.turn == 'Owner' ? setOpponentScore(parsedBoardUpdate.opponentScore) : setOwnerScore(parsedBoardUpdate.ownerScore)
        let squaresCaptured = parsedBoardUpdate.ownerScore + parsedBoardUpdate.opponentScore
        let remainingSquares = totalSquares - squaresCaptured
        setOwnerScore(parsedBoardUpdate.ownerScore)
        setOpponentScore(parsedBoardUpdate.opponentScore)
        if (parsedBoardUpdate.ownerScore + remainingSquares < parsedBoardUpdate.opponentScore) {
          setComplete(true)
        }
        else if (parsedBoardUpdate.opponentScore + remainingSquares < parsedBoardUpdate.ownerScore) {
          setComplete(true)
        }
      }
    }
  }, [boardUpdate])

  useEffect(() => {
    if (complete) {
      document.querySelector('.victory').show()
    }
  }, [complete])

  useEffect(() => {
    if (data.squareGrowth) {
      setGrowth(data.squareGrowth)
    }
  }, [data.squareGrowth])

console.log(data.gameSession.boardData)
  useEffect(() => {
    if (!hasRun) {
      console.log('do i run every time')
      tempSquareArr = JSON.parse(JSON.stringify(data.squareData))
      tempSquareArr.forEach(sq => {
        // boardCode += (colors.indexOf(sq.color))
        squareCounterArr.forEach(counter => {
            if (sq.color == counter.color && !sq.index == 0) {
              counter.count++
            }
          })
      })
    // data.squareGrowth[0] = 'captured'
    // data.squareGrowth[data.squareGrowth.length - 1] = 'captured'
    setGrowth(data.squareGrowth)
    setSquareCounter(squareCounterArr)
    // tempSquareArr.forEach((sq, index) => {
    //   if (sq.captured && sq.owner == "Owner") {
    //     captureCheck(sq.color, index, "Owner");
    //   }
    // });
    // tempSquareArr.forEach((sq, index) => {
    //   if (sq.captured && sq.owner == "Opponent") {
    //     captureCheck(sq.color, index, "Opponent");
    //   }
    // });
    if (data.gameSession.ownerName == user.username) {
      setSelectedColor(data.squareData[0].color)
    }
    else if (data.gameSession.opponentName == user.username) {
      console.log(data.squareData[data.squareData.length - 1].color)
      setSelectedColor(data.squareData[data.squareData.length - 1].color)
    }
    data.squareData = JSON.parse(JSON.stringify(tempSquareArr))
    setColorState(tempSquareArr)
    localStorage.getItem('grid') == 'true' && setGrid(true)
    hasRun = true
    user.username == data.gameSession.opponentName && setSelectedColor(data.squareData[data.squareData.length - 1].color)
    }
    for (let i = 0; i < paletteColors.length; i++) {
      if (localStorage.getItem(paletteColors[i])) {
        document.documentElement.style.setProperty(paletteColors[i], localStorage.getItem(paletteColors[i]))
      } 
    }
    
  }, []);


  function colorChange(color) {
    roundCaptured = 0
    if (data.gameSession.turn == 'Owner' && data.gameSession.ownerName != user.username) {
      alert('it is not your turn')
      return
    }
    else if (data.gameSession.turn == 'Opponent' && data.gameSession.opponentName != user.username) {
      alert('it is not your turn')
      return
    }
    currentPlayer = data.gameSession.turn
    let numberCaptured = totalCaptured
    console.log(localStorage.getItem('playing'))
    // setColorState(tempSquareArr)
    data.squareGrowth.map((e, index) => {
      if (e == 'predicted') {
        data.squareGrowth[index] = false
      }
    })
    // setGrowth(data.squareGrowth)
    !radarActive && turnCount++
    !radarActive && setSelectedColor(color)
    console.log(turnCount)
      tempSquareArr.forEach((sq, index) => {
        if (sq.captured && sq.owner == currentPlayer) {
          console.log('true')
          captureCheck(color, index, currentPlayer)
        }
      })
    setColorState(tempSquareArr)
    setCount(turnCount)
    // if (radarActive) {
    //   tempSquareArr = JSON.parse(JSON.stringify(data.squareData))
    // } 
    // data.squareData = JSON.parse(JSON.stringify(tempSquareArr))
    if (!radarActive) {
      numberCaptured = totalCaptured - numberCaptured
      let captureObj = {
        captured: numberCaptured,
        color: color
      }
      turnLogArr.push(captureObj)
      let newArrayCauseReactIsLame = [...turnLogArr]
      setTurnLog(newArrayCauseReactIsLame)
    }

    // if (totalCaptured >= (boardSize * boardSize) - 1) {
    //   setComplete(true)
    //   let turnLogObj = new Object()
    //   turnLogObj.turnLog = turnLogArr
    //   turnLogJSON = JSON.stringify(turnLogObj)
    //   localStorage.setItem('playing', 'false')
    //   if (turnCount < highScore || highScore == null) {
    //     setHighScore(turnCount)
    //   }
    // }
    let turn
    data.gameSession.turn == 'Owner' ? turn = 'Opponent' : turn = 'Owner'
    boardStateJSON = JSON.stringify(tempSquareArr)
    let squareGrowthJSON = JSON.stringify(data.squareGrowth)
    fetcher.submit({boardState: boardStateJSON, submitType: 'boardUpdate', turn: turn, sessionId: data.gameSession.id, squareGrowth: squareGrowthJSON, captured: numberCaptured}, {method: 'post'})
  }

  useEffect(() => {
    let x = document.querySelectorAll('.row')
    document.querySelectorAll('.row') != null && document.querySelectorAll('.row')[x.length - 1].scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" });
  }, [turnLog])


  function updateSquareCount(color) {
    squareCounterArr.forEach(sq => {
      if (sq.color == color) {
        sq.count--
      }
    })
    setSquareCounter(squareCounterArr)
  }

  function captureCheck(color, index, currentPlayer) {
     console.log(currentPlayer)
    !radarActive ? tempSquareArr[index].fakeColor = color :   tempSquareArr[index].fakeColor = data.squareData[index].fakeColor
    tempSquareArr[index].color = color
    // right
    if (tempSquareArr[index + 1] && tempSquareArr[index + 1].captured == false) {
      if (tempSquareArr[index].color == tempSquareArr[index + 1].color && tempSquareArr[index].rowIndex == tempSquareArr[index + 1].rowIndex) {
        tempSquareArr[index + 1].color = color
        tempSquareArr[index + 1].captured = true
        tempSquareArr[index + 1].owner = currentPlayer
        !radarActive && updateSquareCount(color)
        !radarActive && totalCaptured++
        !radarActive ? data.squareGrowth[index + 1] = `captured ${currentPlayer}` : data.squareGrowth[index + 1] = 'predicted'
        // setGrowth(data.squareGrowth)
        roundCaptured++
        tempSquareArr[index + 1].colIndex <= boardSize && captureCheck(color, index + 1, currentPlayer)
      }
    }
    //left
    if (tempSquareArr[index - 1] && tempSquareArr[index - 1].captured == false) {
      if (tempSquareArr[index].color == tempSquareArr[index - 1].color && tempSquareArr[index].rowIndex == tempSquareArr[index - 1].rowIndex) {
        tempSquareArr[index - 1].color = color
        tempSquareArr[index - 1].captured = true
        tempSquareArr[index - 1].owner = currentPlayer
        !radarActive && updateSquareCount(color)
        !radarActive && totalCaptured++
        !radarActive ? data.squareGrowth[index - 1] = `captured ${currentPlayer}` : data.squareGrowth[index - 1] = 'predicted'
        // setGrowth(data.squareGrowth)
        roundCaptured++
        tempSquareArr[index - 1].colIndex <= boardSize && captureCheck(color, index - 1, currentPlayer)
      }
    }
    // // // // down
    if (tempSquareArr[index + boardSize] && tempSquareArr[index + boardSize].captured == false) {
      if (tempSquareArr[index].color == tempSquareArr[index + boardSize].color) {
        tempSquareArr[index + boardSize].color = color
        tempSquareArr[index + boardSize].captured = true
        tempSquareArr[index + boardSize].owner = currentPlayer
        !radarActive && updateSquareCount(color)
        !radarActive && totalCaptured++
        !radarActive ? data.squareGrowth[index + boardSize] = `captured ${currentPlayer}` : data.squareGrowth[index + boardSize] = 'predicted'
        // setGrowth(data.squareGrowth)
        roundCaptured++
        tempSquareArr[index + boardSize].rowIndex <= boardSize && captureCheck(color, index + boardSize, currentPlayer)
      }
    }
    // // //up
    if (tempSquareArr[index - boardSize] && tempSquareArr[index - boardSize].captured == false) {
      if (tempSquareArr[index].color == tempSquareArr[index - boardSize].color) {
        tempSquareArr[index - boardSize].color = color
        tempSquareArr[index - boardSize].captured = true
        tempSquareArr[index - boardSize].owner = currentPlayer
        !radarActive && updateSquareCount(color)
        !radarActive && totalCaptured++
        !radarActive ? data.squareGrowth[index - boardSize] = `captured ${currentPlayer}` : data.squareGrowth[index - boardSize] = 'predicted'
        // setGrowth(data.squareGrowth)
        roundCaptured++
        tempSquareArr[index - boardSize].rowIndex <= boardSize && captureCheck(color, index - boardSize, currentPlayer)
      }
    }
  }


  function handleRetry() {
    console.log('hi')
    turnCount = 0
    tempSquareArr.forEach(sq => {
      sq.color = sq.defaultColor
      sq.fakeColor = sq.defaultColor
      sq.captured = false
    })
    tempSquareArr[0].captured = true
    
   data.squareGrowth.forEach((e, index) => {
    data.squareGrowth[index] = false
   })
    setGrowth(data.squareGrowth)
    setColorState(tempSquareArr)
    setCount(0)
    totalCaptured = 0
    squareCounterArr.forEach(counter => {
      counter.count = 0
    })

    tempSquareArr.forEach(sq => {
      squareCounterArr.forEach(counter => {
        if (sq.color == counter.color && !sq.index == 0) {
          counter.count++
        }
      })
    })
    
    setSquareCounter(squareCounterArr)
   
    tempSquareArr.forEach((sq, index) => {
      if (sq.captured) {
        captureCheck(sq.color, index);
      }
    });
    setColorState(tempSquareArr)
    setSelectedColor(tempSquareArr[0].color)
    data.squareData = JSON.parse(JSON.stringify(tempSquareArr))
    setComplete(false)
    turnLogArr = []
    setTurnLog(turnLogArr)
    document.querySelector('.endDialog').close()
  }

  function handleSave() {
    setSaveActive(!saveActive)
  }

  function handlePredict() {
    setRadarActive(!radarActive)
    // setColorState(tempSquareArr)
    data.squareGrowth.map((e, index) => {
      if (e == 'predicted') {
        data.squareGrowth[index] = false
      }
    })
    setGrowth(data.squareGrowth)
  }

  const handleGridToggle = (event) => {
    !grid ? localStorage.setItem('grid', 'true') : localStorage.setItem('grid', 'false')
    setGrid(!grid)
  }

  function handlePaletteSwap(event) {
    // document.querySelectorAll('.colorHolder').forEach(e => {
    //   e.classList.remove('selected')
    // })
    // event.currentTarget.classList.add('selected')
    const colors = ['--red', '--orange', '--yellow', '--green', '--blue', '--owner', '--opponent']
    // for (let i = 0; i < 5; i++) {
    //   document.documentElement.style.setProperty(colors[i], `${event.target.parentElement.querySelectorAll('.palColor')[i].style.background}`);
    // }
    for (let i = 0; i < colors.length; i++) {
      localStorage.setItem(colors[i], event.target.parentElement.querySelectorAll('.palColor')[i].style.background)
      document.documentElement.style.setProperty(colors[i], `${event.target.parentElement.querySelectorAll('.palColor')[i].style.background}`)
    }
  }

  function handleOpen() {
    setIsOpen(!isOpen)
  }

  useEffect(() => {
    let x = document.querySelectorAll('.row')
    x != null && document.querySelectorAll('.row')[x.length - 1].scrollIntoView({ behavior: "smooth", block: "end", inline: "nearest" });
  }, [isOpen])

  function handleRedirect() {
    window.location.href = '/pvpmenu'
  }

  return (
    <div className='gameContainer'>
      <Beforeunload onBeforeunload={(event) => event.preventDefault()} />
      <div className='settingsIcon' onClick={handleOpen}>{isOpen ? 'X' : 'O'}</div>
      <dialog className='victory'>
        {ownerScore > opponentScore ? 
        <div>
          <h2>{data.gameSession.ownerName} wins the game!</h2>
          <h3>Score: {user.username == data.gameSession.ownerName ? `${ownerScore} - ${opponentScore}` : `${opponentScore} - ${ownerScore}`}</h3>
          <button onClick={handleRedirect}>Return to lobby</button>
        </div> :
        <div>
          <h2>{data.gameSession.opponentName} wins the game!</h2>
          <h3>Score: {user.username == data.gameSession.ownerName ? `${ownerScore} - ${opponentScore}` : `${opponentScore} - ${ownerScore}`}</h3>
          <button onClick={handleRedirect}>Return to lobby</button>
        </div>
        }
      </dialog>
    <section className={`left ${isOpen ? 'hide' : ''}`}>
      <section className='buttonSection'>
        {user.username == data.gameSession.ownerName ? 
        <div className={`colorRow ${data.gameSession.turn == 'Owner' && data.gameSession.ownerName == user.username ? 'faded' : ''}`}>
          <div className={`color off ${data.squareData[data.squareData.length - 1].color == 'var(--red)' ? 'grayed' : ''}`} style={{background: 'var(--red)'}}></div>
          <div className={`color off ${data.squareData[data.squareData.length - 1].color == 'var(--orange)' ? 'grayed' : ''}`} style={{background: 'var(--orange)'}}></div>
          <div className={`color off ${data.squareData[data.squareData.length - 1].color == 'var(--yellow)' ? 'grayed' : ''}`} style={{background: 'var(--yellow)'}}></div>
          <div className={`color off ${data.squareData[data.squareData.length - 1].color == 'var(--green)' ? 'grayed' : ''}`} style={{background: 'var(--green)'}}></div>
          <div className={`color off ${data.squareData[data.squareData.length - 1].color == 'var(--blue)' ? 'grayed' : ''}`} style={{background: 'var(--blue)'}}></div>
        </div> :
        <div className={`colorRow ${data.gameSession.turn == 'Opponent' && data.gameSession.opponentName == user.username ? 'faded' : ''}`}>
          <div className={`color off ${data.squareData[0].color == 'var(--red)' ? 'grayed' : ''}`} style={{background: 'var(--red)'}}></div>
          <div className={`color off ${data.squareData[0].color == 'var(--orange)' ? 'grayed' : ''}`} style={{background: 'var(--orange)'}}></div>
          <div className={`color off ${data.squareData[0].color == 'var(--yellow)' ? 'grayed' : ''}`} style={{background: 'var(--yellow)'}}></div>
          <div className={`color off ${data.squareData[0].color == 'var(--green)' ? 'grayed' : ''}`} style={{background: 'var(--green)'}}></div>
          <div className={`color off ${data.squareData[0].color == 'var(--blue)' ? 'grayed' : ''}`} style={{background: 'var(--blue)'}}></div>
        </div>
        }
      </section>
      <div className={`board ${user.username == data.gameSession.opponentName ? 'flip' : ''}`} style={{gridTemplateColumns: `repeat(${boardSize}, 1fr)`, background: !radarActive ? selectedColor : 'white'}}>
        {data.squareData.map((sq, index) => {
          return (
            <div className={`square ${data.squareGrowth[index] == false ? '' : data.squareGrowth[index]}`} key={sq.index} style={{background: colorState[index].fakeColor, border: grid ? '1px solid black' : ''}}></div>
          )
        })}
      </div>
      <section className='buttonSection'>
        {/* <div className='extraRow'>
          <div className='resetButton'>
            <fetcher.Form reloadDocument method='post' action='/game'>
              <input type='hidden' value='newBoard' name='submitType'></input>
              <input type='hidden' value={newBoardSize} name='newBoardSize'></input>
              <button type='submit'>New Board</button>
            </fetcher.Form>
          </div>
          <button className='retryButton' onClick={handleRetry}>Retry Board</button>
          <button className={`predictButton ${radarActive == true ? 'active' : ''}`} onClick={handlePredict}>Radar</button>
        </div> */}
        {user.username == data.gameSession.ownerName ? 
        <div className={`colorRow ${data.gameSession.turn == 'Owner' && data.gameSession.ownerName == user.username ? '' : 'faded'}`}>
          <div className={`color ${selectedColor === 'var(--red)' ? 'grayed' : ''}`} onClick={!complete ? () => colorChange('var(--red)') : ''} onMouseEnter={e => radarActive ? colorChange('var(--red)') : e.preventDefault()} style={{ background: 'var(--red)' }}></div>
          <div className={`color ${selectedColor === 'var(--orange)' ? 'grayed' : ''}`} onClick={!complete ? () => colorChange('var(--orange)') : ''} onMouseEnter={e => radarActive ? colorChange('var(--orange)') : e.preventDefault()} style={{ background: 'var(--orange)' }}></div>
          <div className={`color ${selectedColor === 'var(--yellow)' ? 'grayed' : ''}`} onClick={!complete ? () => colorChange('var(--yellow)') : ''} onMouseEnter={e => radarActive ? colorChange('var(--yellow)') : e.preventDefault()} style={{ background: 'var(--yellow)' }}></div>
          <div className={`color ${selectedColor === 'var(--green)' ? 'grayed' : ''}`} onClick={!complete ? () => colorChange('var(--green)') : ''} onMouseEnter={e => radarActive ? colorChange('var(--green)') : e.preventDefault()} style={{ background: 'var(--green)' }}></div>
          <div className={`color ${selectedColor === 'var(--blue)' ? 'grayed' : ''}`} onClick={!complete ? () => colorChange('var(--blue)') : ''} onMouseEnter={e => radarActive ? colorChange('var(--blue)') : e.preventDefault()} style={{ background: 'var(--blue)' }}></div>
        </div> :
        <div className={`colorRow ${data.gameSession.turn == 'Opponent' && data.gameSession.opponentName == user.username ? '' : 'faded'}`}>
          <div className={`color ${selectedColor === 'var(--red)' ? 'grayed' : ''}`} onClick={!complete ? () => colorChange('var(--red)') : ''} onMouseEnter={e => radarActive ? colorChange('var(--red)') : e.preventDefault()} style={{ background: 'var(--red)' }}></div>
          <div className={`color ${selectedColor === 'var(--orange)' ? 'grayed' : ''}`} onClick={!complete ? () => colorChange('var(--orange)') : ''} onMouseEnter={e => radarActive ? colorChange('var(--orange)') : e.preventDefault()} style={{ background: 'var(--orange)' }}></div>
          <div className={`color ${selectedColor === 'var(--yellow)' ? 'grayed' : ''}`} onClick={!complete ? () => colorChange('var(--yellow)') : ''} onMouseEnter={e => radarActive ? colorChange('var(--yellow)') : e.preventDefault()} style={{ background: 'var(--yellow)' }}></div>
          <div className={`color ${selectedColor === 'var(--green)' ? 'grayed' : ''}`} onClick={!complete ? () => colorChange('var(--green)') : ''} onMouseEnter={e => radarActive ? colorChange('var(--green)') : e.preventDefault()} style={{ background: 'var(--green)' }}></div>
          <div className={`color ${selectedColor === 'var(--blue)' ? 'grayed' : ''}`} onClick={!complete ? () => colorChange('var(--blue)') : ''} onMouseEnter={e => radarActive ? colorChange('var(--blue)') : e.preventDefault()} style={{ background: 'var(--blue)' }}></div>
        </div>
        }
       
      </section>
    </section>
    <section className='right'>
      <div className='captureCounter'>
        <div className='me'>
          <h4 className='playerName'>{user.username == data.gameSession.ownerName ? data.gameSession.ownerName : data.gameSession.opponentName}</h4>
          <div className='fakeSquare' style={{background: user.username == data.gameSession.ownerName ? ' var(--owner)' : 'var(--opponent)'}}>
            <h4>{user.username == data.gameSession.ownerName ? ownerScore : opponentScore}</h4>
          </div>
        </div>
        <div className='you'>
          <h4 className='playerName'>{user.username == data.gameSession.ownerName ? data.gameSession.opponentName : data.gameSession.ownerName}</h4>
          <div className='fakeSquare' style={{background: user.username == data.gameSession.ownerName ? ' var(--opponent)' : 'var(--owner)'}}>
            <h4>{user.username == data.gameSession.ownerName ? opponentScore : ownerScore}</h4>
          </div>
        </div>
      </div>
      {/* <div className='scoreboard'>
      <h2>{data.bestGlobalScore ? `Score to Beat: ${data.bestGlobalScore.score}` : `High Score: ${highScore}`}</h2>
      <h3>Squares Remaining</h3>
        <div className='squareRow'>
          <div className='fakeSquare' style={{background: 'var(--red)'}}>
            <h4>{squareCounter[0].count}</h4>
          </div>
          <div className='fakeSquare' style={{background: 'var(--orange)'}}>
            <h4>{squareCounter[1].count}</h4>
          </div>
          <div className='fakeSquare' style={{background: 'var(--yellow)'}}>
            <h4>{squareCounter[2].count}</h4>
          </div>
          <div className='fakeSquare'  style={{background: 'var(--green)'}}>
            <h4>{squareCounter[3].count}</h4>
          </div>
          <div className='fakeSquare'  style={{background: 'var(--blue)'}}>
            <h4>{squareCounter[4].count}</h4>
          </div>
        </div>
      </div> */}
      <div className={`options ${isOpen ? 'show' : ''}`}>
        <div className='optionWrap'>
          <div className='gridView'>
            <h2>Grid View</h2>
            <input id='grid' type='checkbox' value='1px solid black' checked={grid} name='grid' onChange={handleGridToggle}></input>
            <label htmlFor='grid'>Grid</label>
          </div>
        </div>
        <div className='turnLog'>
          <h3>Turn Log</h3>
          <div className='row'>
              <h3>Turn</h3>
              <h3>Captured</h3>
          </div>
          {data.bestGlobalScore && <div className='row'>
              <h3></h3>
              <h3>You</h3>
              <h3>{data.bestGlobalScore.userName}</h3>
          </div>}
          {/* <div className='turnLogBox'>
            {turnLog && turnLog.map((row, index) => {
              return (
                <div className='row'>
                <h3>{index + 1}</h3>
                <div className='turnInfo'>
                  <div className='fakeSquare' style={{background: turnLog[index].color}}>
                    <h4>{turnLog[index].captured}</h4>
                  </div>
                </div>
                {oppTurnLog != null && <div className='turnInfo'>
                  <div className='fakeSquare' style={oppTurnLog.turnLog[index] && {background: oppTurnLog.turnLog[index].color}}>
                    <h4>{oppTurnLog.turnLog[index] && oppTurnLog.turnLog[index].captured}</h4>
                  </div>
                </div>}
              </div>
              )
            })}
            <div className='anchor'></div>
          </div> */}
        </div>
        <h2 className='colorOptions'>Color Options</h2>
        <div className='colorPalette'>
          <div className='colorHolder selectedPalette'>
            <div className='palColor' style={{background: 'var(--red)'}}></div>
            <div className='palColor' style={{background: 'var(--orange)'}}></div>
            <div className='palColor' style={{background: 'var(--yellow)'}}></div>
            <div className='palColor' style={{background: 'var(--green)'}}></div>
            <div className='palColor' style={{background: 'var(--blue)'}}></div>
          </div>
          <div className='colorHolder' onClick={handlePaletteSwap}>
            <div className='palColor' style={{background: 'hsl(0, 100%, 40%)'}}></div>
            <div className='palColor' style={{background: 'hsl(22, 100%, 50%)'}}></div>
            <div className='palColor' style={{background: 'hsl(60, 100%, 50%)'}}></div>
            <div className='palColor' style={{background: 'hsl(130, 100%, 15%)'}}></div>
            <div className='palColor' style={{background: 'hsl(242, 69%, 49%)'}}></div>
            <div className='palColor hide' style={{background: 'white'}}></div>
            <div className='palColor hide' style={{background: 'rgb(31, 31, 31)'}}></div>
          </div>
          <div className='colorHolder' onClick={handlePaletteSwap}>
            <div className='palColor' style={{background: 'hsl(33, 90.8%, 12.7%)'}}></div>
            <div className='palColor' style={{background: 'hsl(33, 89.8%, 26.9%)'}}></div>
            <div className='palColor' style={{background: 'hsl(25, 95.4%, 42.7%)'}}></div>
            <div className='palColor' style={{background: 'hsl(221, 69.2%, 43.3%)'}}></div>
            <div className='palColor' style={{background: 'hsl(213, 68.6%, 90%)'}}></div>
            <div className='palColor hide' style={{background: 'rgb(133, 7, 7)'}}></div>
            <div className='palColor hide' style={{background: 'rgb(8, 68, 17)'}}></div>
          </div>
          <div className='colorHolder' onClick={handlePaletteSwap}>
            <div className='palColor' style={{background: 'hsl(358,83%,35%)'}}></div>
            <div className='palColor' style={{background: 'hsl(2,72%,51%)'}}></div>
            <div className='palColor' style={{background: 'hsl(211,88%,32%)'}}></div>
            <div className='palColor' style={{background: 'hsl(0,0%,39%)'}}></div>
            <div className='palColor' style={{background: 'hsl(0,0%,14%)'}}></div>
            <div className='palColor hide' style={{background: 'rgb(143, 4, 156)'}}></div>
            <div className='palColor hide' style={{background: 'rgb(255, 235, 15)'}}></div>
          </div>
          <div className='colorHolder' onClick={handlePaletteSwap}>
            <div className='palColor' style={{background: 'hsl(164,95%,43%)'}}></div>
            <div className='palColor' style={{background: 'hsl(240,100%,98%)'}}></div>
            <div className='palColor' style={{background: 'hsl(43,100%,70%)'}}></div>
            <div className='palColor' style={{background: 'hsl(197,19%,36%)'}}></div>
            <div className='palColor' style={{background: 'hsl(200,43%,7%)'}}></div>
            <div className='palColor hide' style={{background: 'rgb(5, 73, 157)'}}></div>
            <div className='palColor hide' style={{background: 'rgb(197, 42, 11)'}}></div>
          </div>
          <div className='colorHolder' onClick={handlePaletteSwap}>
            <div className='palColor' style={{background: 'hsl(7,55%,30%)'}}></div>
            <div className='palColor' style={{background: 'hsl(6,56%,49%)'}}></div>
            <div className='palColor' style={{background: 'hsl(24,38%,87%)'}}></div>
            <div className='palColor' style={{background: 'hsl(183,66%,28%)'}}></div>
            <div className='palColor' style={{background: 'hsl(180,20%,20%)'}}></div>
            <div className='palColor hide' style={{background: 'rgb(228, 174, 13)'}}></div>
            <div className='palColor hide' style={{background: 'rgb(110, 13, 228)'}}></div>
          </div>
          <div className='colorHolder' onClick={handlePaletteSwap}>
            <div className='palColor' style={{background: 'hsl(306, 81%, 21%)'}}></div>
            <div className='palColor' style={{background: 'hsl(327,100%,44%)'}}></div>
            <div className='palColor' style={{background: 'hsl(211,88%,32%)'}}></div>
            <div className='palColor' style={{background: 'hsl(0,0%,39%)'}}></div>
            <div className='palColor' style={{background: 'hsl(0,0%,14%)'}}></div>
            <div className='palColor hide' style={{background: 'rgb(23, 190, 8)'}}></div>
            <div className='palColor hide' style={{background: 'rgb(190, 20, 8)'}}></div>
          </div>
          <div className='colorHolder' onClick={handlePaletteSwap}>
            <div className='palColor' style={{background: 'hsl(83, 45%, 18%)'}}></div>
            <div className='palColor' style={{background: 'hsl(59,70%,30%)'}}></div>
            <div className='palColor' style={{background: 'hsl(55, 47%, 78%)'}}></div>
            <div className='palColor' style={{background: 'hsl(48,99%,59%)'}}></div>
            <div className='palColor' style={{background: 'hsl(27, 55%, 33%)'}}></div>
            <div className='palColor hide' style={{background: 'rgb(31, 194, 215)'}}></div>
            <div className='palColor hide' style={{background: 'rgb(204, 72, 16)'}}></div>
          </div>
        </div>
        <div className='link'>
          <Link to='/'>Return to Main Menu</Link>
        </div>
      </div>
    </section>
    </div>
  )
}

export function links() {
    return [{rel: 'stylesheet', href: gameStyle}]
  }

export default App
