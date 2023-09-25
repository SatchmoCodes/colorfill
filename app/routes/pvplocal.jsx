import { useState } from 'react'
import { useEffect } from 'react'
import { json, redirect } from "@remix-run/node";
import gameStyle from '~/styles/game.css'
import generateBoard from './pvpGenerator'
import { Link } from "@remix-run/react";

import { useUser } from "~/utils";
import { requireUserId } from "~/session.server";
import { Form, useActionData, useLoaderData} from '@remix-run/react'
import { createBoard} from '~/models/board.server'
import { createScore} from '~/models/score.server'
import { getBoard } from '~/models/board.server'
import invariant from "tiny-invariant";

import { useFetcher } from "@remix-run/react";
import { getBestScore } from '../models/score.server';



export const loader = async ({ params, request }) => {
  const userId = await requireUserId(request);
  invariant(params.boardId, "boardId not found");

  const board = await getBoard({ id: params.boardId });
  if (!board) {
    throw new Response("Not Found", { status: 404 });
  }
  let squareData = generateBoard(board.boardData).flat()
  let squareGrowth = new Array(board.boardData.length).fill(false)
  let bestScore = await getBestScore({ userId, gamemode: 'Free Play', size: board.size})

  return json({ board, squareData, squareGrowth, bestScore });
};


export const action = async ({ request }) => {
  const userId = await requireUserId(request)
  const formData = await request.formData()
  const submitType = formData.get('submitType')
  let newBoardSize = formData.get('newBoardSize')
  const gamemode = 'Free Play'
  let boardData = ''

  for (let i = 0; i < newBoardSize * newBoardSize; i++) {
    boardData+= Math.floor(Math.random() * 5)
  }

  switch(newBoardSize) {
    case '10':
      newBoardSize = 'Small'
      break;
    case '20':
      newBoardSize = 'Medium'
      break;
    case '30':
      newBoardSize = 'Large'
      break;
  }

  if (submitType == 'submit') {
    const score = formData.get('score')
    const boardId = formData.get('boardId')
    let boardSize = formData.get('boardSize')
    switch(boardSize) {
      case '10':
        boardSize = 'Small'
        break;
      case '20':
        boardSize = 'Medium'
        break;
      case '30':
        boardSize = 'Large'
        break;
    }
    const newScore = await createScore({ score, gamemode, userId, boardId, boardSize })
  }
    const newBoard = await createBoard({ size: newBoardSize, boardData, userId})
    
    return redirect(`/game/${newBoard.id}`)
}

const colors = ['var(--red)', 'var(--orange)', 'var(--yellow)', 'var(--green)', 'var(--blue)']
const paletteColors = ['--red', '--orange', '--yellow', '--green', '--blue']
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
let hasRun = false

let turnOrder = 1
let oneCount = 1
let twoCount = 1
let captureColor

function App() {
  const user = useUser()
  const fetcher = useFetcher()
  const data = useLoaderData()

  console.log(data.squareData)

  const [count, setCount] = useState(turnCount) //track # of turns
  const [colorState, setColorState] = useState(data.squareData) //tracks color of entire board
  const [squareCounter, setSquareCounter] = useState(squareCounterArr) //sets number of squares left
  const [highScore, setHighScore] = useState(data.bestScore == null ? '' : data.bestScore.score)
  const [selectedColor, setSelectedColor] = useState(data.squareData[0].color) //sets selected color at bottom
  const [saveActive, setSaveActive] = useState(false)
  const [radarActive, setRadarActive] = useState(false)
  const [growth, setGrowth] = useState(data.squareGrowth) //class animation on capture
  const [customBoardSize, setCustomBoardSize] = useState('')
  const [boardSize, setBoardSize] = useState(Math.sqrt(data.board.boardData.length))
  const [newBoardSize, setNewBoardSize] = useState(Math.sqrt(data.board.boardData.length))
  const [grid, setGrid] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const [playerOneColor, setPlayerOneColor] = useState(data.squareData[0].color)
  const [playerTwoColor, setPlayerTwoColor] = useState(data.squareData[data.squareData.length - 1].color)
  const [oneCaptureCount, setOneCaptureCount] = useState(1)
  const [twoCaptureCount, setTwoCaptureCount] = useState(1)
  const [turn, setTurn] = useState(turnOrder)

  const [boardId, setBoardId] = useState(data.board.id)

  useEffect(() => {
    if (!hasRun) {
      if (localStorage.getItem('recentId') == data.board.id && localStorage.getItem('playing') == 'true') {
        tempSquareArr = JSON.parse(localStorage.getItem('boardData'))
        setGrowth(JSON.parse(localStorage.getItem('growthArr')))
        turnCount = localStorage.getItem('turnCount')
        totalCaptured = localStorage.getItem('totalCaptured')
        squareCounterArr = JSON.parse(localStorage.getItem('squareCounter'))
        setSelectedColor(localStorage.getItem('selectedColor'))
        setSquareCounter(squareCounterArr)
        setCount(turnCount)
      }
      else {
        tempSquareArr = JSON.parse(JSON.stringify(data.squareData))
        tempSquareArr.forEach(sq => {
          // boardCode += (colors.indexOf(sq.color))
          squareCounterArr.forEach(counter => {
              if (sq.color == counter.color && !sq.index == 0) {
                sq.index != tempSquareArr.length - 1 && counter.count++
              }
            })
        })
      }
    data.squareGrowth[0] = 'captured one'
    data.squareGrowth[data.squareGrowth.length -1] = 'captured two'
    setGrowth(data.squareGrowth)
    setSquareCounter(squareCounterArr)
    tempSquareArr.forEach((sq, index) => {
      if (sq.captured && sq.owner == 1) {
        captureCheck(sq.color, index, 1);
      }
    });
    tempSquareArr.forEach((sq, index) => {
        if (sq.captured && sq.owner == 2) {
          captureCheck(sq.color, index, 2);
        }
      });
    setColorState(tempSquareArr)
    localStorage.getItem('grid') == 'true' && setGrid(true)
    hasRun = true
    }

    for (let i = 0; i < 5; i++) {
      if (localStorage.getItem(paletteColors[i])) {
        document.documentElement.style.setProperty(paletteColors[i], localStorage.getItem(paletteColors[i]))
      } 
    }
    
  }, []);

  function colorChange(color, player) {
    if (turnOrder != player) {
        console.log('it is not your turn')
        return
    }
    setColorState(tempSquareArr)
    data.squareGrowth.map((e, index) => {
      if (e == 'predicted') {
        data.squareGrowth[index] = false
      }
    })
    setGrowth(data.squareGrowth)
    !radarActive && turnCount++
    // !radarActive && setSelectedColor(color)
    player == 1 ? setPlayerOneColor(color) : setPlayerTwoColor(color)
      tempSquareArr.forEach((sq, index) => {
        if (sq.captured && sq.owner == player) {
          captureCheck(color, index, player)
        }
      })
    setColorState(tempSquareArr)
    setCount(turnCount)
    if (radarActive) {
      tempSquareArr = JSON.parse(JSON.stringify(data.squareData))
    } 
    data.squareData = JSON.parse(JSON.stringify(tempSquareArr))

    turnOrder == 1 ? turnOrder = 2 : turnOrder = 1
    setTurn(turnOrder)

    //saving board status to local storage if user quits early
    if (turnCount >= 1) {
      console.log('new board saved')
      localStorage.setItem('recentId', data.board.id)
      localStorage.setItem('boardData', JSON.stringify(data.squareData))
      localStorage.setItem('turnCount', turnCount)
      localStorage.setItem('squareCounter', JSON.stringify(squareCounterArr))
      localStorage.setItem('growthArr', JSON.stringify(data.squareGrowth))
      localStorage.setItem('totalCaptured', totalCaptured)
      localStorage.setItem('playing', 'true')
      localStorage.setItem('gamemode', 'pvp')
      localStorage.setItem('selectedColor', color)
    }

    if (oneCount > 220 || twoCount > 220) {
      localStorage.setItem('playing', 'false')
      document.querySelector('.endDialog').show()
      if (turnCount < highScore || highScore == null) {
        setHighScore(turnCount)
      }
    }
  }

  function updateSquareCount(color, player) {
    squareCounterArr.forEach(sq => {
      if (sq.color == color) {
        sq.count--
        player == 1 ? oneCount++ : twoCount++
        player == 1 ? setOneCaptureCount(oneCount) : setTwoCaptureCount(twoCount)
      }
    })
    setSquareCounter(squareCounterArr)
  }

  function captureCheck(color, index, player) {
    switch(player) {
        case 1:
            captureColor = 'one'
            break
        case 2:
            captureColor = 'two'
            break
    }
    !radarActive ? tempSquareArr[index].fakeColor = color : tempSquareArr[index].fakeColor = data.squareData[index].fakeColor
    tempSquareArr[index].color = color
    // right
    if (tempSquareArr[index + 1] && tempSquareArr[index + 1].captured == false) {
      if (tempSquareArr[index].color == tempSquareArr[index + 1].color && tempSquareArr[index].rowIndex == tempSquareArr[index + 1].rowIndex) {
        tempSquareArr[index + 1].color = color
        tempSquareArr[index + 1].captured = true
        tempSquareArr[index + 1].owner = player
        !radarActive && updateSquareCount(color, player)
        !radarActive && totalCaptured++
        !radarActive ? data.squareGrowth[index + 1] = `captured ${captureColor}` : data.squareGrowth[index + 1] = 'predicted'
        setGrowth(data.squareGrowth)
        tempSquareArr[index + 1].colIndex <= boardSize && captureCheck(color, index + 1, player)
      }
    }
    //left
    if (tempSquareArr[index - 1] && tempSquareArr[index - 1].captured == false) {
      if (tempSquareArr[index].color == tempSquareArr[index - 1].color && tempSquareArr[index].rowIndex == tempSquareArr[index - 1].rowIndex) {
        tempSquareArr[index - 1].color = color
        tempSquareArr[index - 1].captured = true
        tempSquareArr[index - 1].owner = player
        !radarActive && updateSquareCount(color, player)
        !radarActive && totalCaptured++
        !radarActive ? data.squareGrowth[index - 1] = `captured ${captureColor}` : data.squareGrowth[index - 1] = 'predicted'
        setGrowth(data.squareGrowth)
        tempSquareArr[index - 1].colIndex <= boardSize && captureCheck(color, index - 1, player)
      }
    }
    // // // // down
    if (tempSquareArr[index + boardSize] && tempSquareArr[index + boardSize].captured == false) {
      if (tempSquareArr[index].color == tempSquareArr[index + boardSize].color) {
        tempSquareArr[index + boardSize].color = color
        tempSquareArr[index + boardSize].captured = true
        tempSquareArr[index + boardSize].owner = player
        !radarActive && updateSquareCount(color, player)
        !radarActive && totalCaptured++
        !radarActive ? data.squareGrowth[index + boardSize] = `captured ${captureColor}` : data.squareGrowth[index + boardSize] = 'predicted'
        setGrowth(data.squareGrowth)
        tempSquareArr[index + boardSize].rowIndex <= boardSize - 2 && captureCheck(color, index + boardSize, player)
      }
    }
    // // //up
    if (tempSquareArr[index - boardSize] && tempSquareArr[index - boardSize].captured == false) {
      if (tempSquareArr[index].color == tempSquareArr[index - boardSize].color) {
        tempSquareArr[index - boardSize].color = color
        tempSquareArr[index - boardSize].captured = true
        tempSquareArr[index - boardSize].owner = player
        !radarActive && updateSquareCount(color, player)
        !radarActive && totalCaptured++
        !radarActive ? data.squareGrowth[index - boardSize] = `captured ${captureColor}` : data.squareGrowth[index - boardSize] = 'predicted'
        setGrowth(data.squareGrowth)
        tempSquareArr[index - boardSize].rowIndex <= boardSize && captureCheck(color, index - boardSize, player)
      }
    }
  }

  function surroundCheck(index, player) {
    if (tempSquareArr[index + 1] == null || tempSquareArr[index + 1].owner == player) {

    }
    else if (tempSquareArr[index + 1].captured == false) {
        if (tempSquareArr[index].owner == player && tempSquareArr[index].rowIndex == tempSquareArr[index + 1].rowIndex) {
          tempSquareArr[index + 1].color = color
          tempSquareArr[index + 1].captured = true
          tempSquareArr[index + 1].owner = player
          !radarActive && updateSquareCount(color, player)
          !radarActive && totalCaptured++
          !radarActive ? data.squareGrowth[index + 1] = `captured ${captureColor}` : data.squareGrowth[index + 1] = 'predicted'
          setGrowth(data.squareGrowth)
          tempSquareArr[index + 1].colIndex <= boardSize && captureCheck(color, index + 1, player)
        }
      }
  }


  // function handleReset() {
  //   turnCount = 0
  //   if (!saveActive) {
  //     if (customBoardSize >= 5 && customBoardSize <= 40) {
  //       boardSize = customBoardSize
  //       totalDim = customBoardSize * customBoardSize
  //     }
  //     setBoardSize(boardSize)
  //     // tempSquareArr = generateBoard(boardSize, totalDim).flat().slice(0, totalDim)
  //   }
  //   else {
  //     tempSquareArr.forEach(sq => {
  //       sq.color = sq.defaultColor
  //       sq.fakeColor = sq.defaultColor
  //       sq.captured = false
  //     })
  //     tempSquareArr[0].captured = true
  //   }
  //   data.squareGrowth = new Array(totalDim).fill(false)
  //   setGrowth(data.squareGrowth)
  //   setColorState(tempSquareArr)
  //   setCount(0)
  //   totalCaptured = 0
  //   squareCounterArr.forEach(counter => {
  //     counter.count = 0
  //   })

  //   tempSquareArr.forEach(sq => {
  //     squareCounterArr.forEach(counter => {
  //       if (sq.color == counter.color && !sq.index == 0) {
  //         counter.count++
  //       }
  //     })
  //   })
    
  //   setSquareCounter(squareCounterArr)
   
  //   tempSquareArr.forEach((sq, index) => {
  //     if (sq.captured) {
  //       captureCheck(sq.color, index);
  //     }
  //   });
  //   setColorState(tempSquareArr)
  //   setSelectedColor(tempSquareArr[0].color)
  //   data.squareData = JSON.parse(JSON.stringify(tempSquareArr))
  // }

  function handleSave() {
    setSaveActive(!saveActive)
  }

  function handlePredict() {
    setRadarActive(!radarActive)
    setColorState(data.squareData)
    data.squareGrowth.map((e, index) => {
      if (e == 'predicted') {
        data.squareGrowth[index] = false
      }
    })
    setGrowth(data.squareGrowth)
  }

  function handleSizeChange(event) {
    // console.log(customBoardSize)
    // if (customBoardSize >= 5 && customBoardSize <= 40) {
    //   boardSize = parseInt(customBoardSize)
    //   totalDim = parseInt(customBoardSize * customBoardSize)
    //   sizeString = 'Custom'
    // }
    // else {
    //   boardSize = parseInt(event.target.value)
    //   totalDim = parseInt(event.target.value * event.target.value)
    //   handleReset()
    // }
    setNewBoardSize(event.target.value)
  }

  const handleCustomBoardSize = (event) => {
    console.log(event.target.value)
    if (event.target.value == '') {
      setCustomBoardSize('')
    }
    else {
      let x = parseInt(event.target.value)
      setCustomBoardSize(x)
    }
  }

  const handleGridToggle = (event) => {
    !grid ? localStorage.setItem('grid', 'true') : localStorage.setItem('grid', 'false')
    setGrid(!grid)
  }

  function handlePaletteSwap(event) {
    const colors = ['--red', '--orange', '--yellow', '--green', '--blue']
    // for (let i = 0; i < 5; i++) {
    //   document.documentElement.style.setProperty(colors[i], `${event.target.parentElement.querySelectorAll('.palColor')[i].style.background}`);
    // }
    for (let i = 0; i < 5; i++) {
      localStorage.setItem(colors[i], event.target.parentElement.querySelectorAll('.palColor')[i].style.background)
      document.documentElement.style.setProperty(colors[i], `${event.target.parentElement.querySelectorAll('.palColor')[i].style.background}`)
    }
  }

  function handleOpen() {
    setIsOpen(!isOpen)
  }


  return (
    <div className='gameContainer'>
      <div className='settingsIcon' onClick={handleOpen}>{isOpen ? 'X' : 'O'}</div>
      <dialog className='endDialog'>
        <fetcher.Form reloadDocument method='post' action='/game'>
          <h2>Player {oneCaptureCount > 220 ? "one" : "two"} wins with {oneCaptureCount > 220 ? oneCaptureCount : twoCaptureCount} squares!</h2>
          <input type='hidden' value={count} name='score'></input>
          <input type='hidden' value={boardSize} name='boardSize'></input>
          <input type='hidden' value={boardId} name='boardId'></input>
          <input type='hidden' value={newBoardSize} name='newBoardSize'></input>
          <input type='hidden' value={'submit'} name='submitType'></input>
          <button type='submit'>Submit</button>
        </fetcher.Form>
      </dialog>
    <section className='left'>
      {/* <h1>{count}</h1> */}
      <section className='buttonSection'>
        <div className='captureCounter'>
                <div className='fakeSquare one'>
                    <h4>{oneCaptureCount}</h4>
                </div>
                <div className='fakeSquare two'>
                    <h4>{twoCaptureCount}</h4>
                </div>
            </div>
        <div className={`colorRow`}>
            <div className={`color ${playerTwoColor === 'var(--red)' ? 'grayed' : ''} ${turn == 2 ? '' : 'faded'}` } onClick={() => colorChange('var(--red)', 2)} onMouseEnter={e => radarActive ? colorChange('var(--red)') : e.preventDefault()} style={{ background: 'var(--red)' }}></div>
            <div className={`color ${playerTwoColor === 'var(--orange)' ? 'grayed' : ''} ${turn == 2 ? '' : 'faded'}`} onClick={() => colorChange('var(--orange)', 2)} onMouseEnter={e => radarActive ? colorChange('var(--orange)') : e.preventDefault()} style={{ background: 'var(--orange)' }}></div>
            <div className={`color ${playerTwoColor === 'var(--yellow)' ? 'grayed' : ''} ${turn == 2 ? '' : 'faded'}`} onClick={() => colorChange('var(--yellow)', 2)} onMouseEnter={e => radarActive ? colorChange('var(--yellow)') : e.preventDefault()} style={{ background: 'var(--yellow)' }}></div>
            <div className={`color ${playerTwoColor === 'var(--green)' ? 'grayed' : ''} ${turn == 2 ? '' : 'faded'}`} onClick={() => colorChange('var(--green)', 2)} onMouseEnter={e => radarActive ? colorChange('var(--green)') : e.preventDefault()} style={{ background: 'var(--green)' }}></div>
            <div className={`color ${playerTwoColor === 'var(--blue)' ? 'grayed' : ''} ${turn == 2 ? '' : 'faded'}`} onClick={() => colorChange('var(--blue)', 2)} onMouseEnter={e => radarActive ? colorChange('var(--blue)') : e.preventDefault()} style={{ background: 'var(--blue)' }}></div>
            </div>
        </section>
        <div className='board' style={{gridTemplateColumns: `repeat(${boardSize}, 1fr)`, background: !radarActive ? selectedColor : 'white'}}>
            {data.squareData.map((sq, index) => {
            return (
                <div className={`square ${data.squareGrowth[index] == false ? '' : data.squareGrowth[index]}`} key={sq.index} style={{background: colorState[index].fakeColor, border: grid ? '1px solid black' : ''}}></div>
            )
            })}
        </div>
      
      <section className='buttonSection'>
        {/* <div className='extraRow'>
          <div className='resetButton'>
            <fetcher.Form reloadDocument method='post'>
              <input type='hidden' value='reset' name='submitType'></input>
              <input type='hidden' value={newBoardSize} name='newBoardSize'></input>
              <button type='submit'>New Board</button>
            </fetcher.Form>
          </div>
          <button className={`predictButton ${radarActive == true ? 'active' : ''}`} onClick={handlePredict}>Radar</button>
        </div> */}
        <div className='colorRow'>
          <div className={`color ${playerOneColor === 'var(--red)' ? 'grayed' : ''} ${turn == 1 ? '' : 'faded'}`} onClick={() => colorChange('var(--red)', 1)} onMouseEnter={e => radarActive ? colorChange('var(--red)') : e.preventDefault()} style={{ background: 'var(--red)' }}></div>
          <div className={`color ${playerOneColor === 'var(--orange)' ? 'grayed' : ''} ${turn == 1 ? '' : 'faded'}`} onClick={() => colorChange('var(--orange)', 1)} onMouseEnter={e => radarActive ? colorChange('var(--orange)') : e.preventDefault()} style={{ background: 'var(--orange)' }}></div>
          <div className={`color ${playerOneColor === 'var(--yellow)' ? 'grayed' : ''} ${turn == 1 ? '' : 'faded'}`} onClick={() => colorChange('var(--yellow)', 1)} onMouseEnter={e => radarActive ? colorChange('var(--yellow)') : e.preventDefault()} style={{ background: 'var(--yellow)' }}></div>
          <div className={`color ${playerOneColor === 'var(--green)' ? 'grayed' : ''} ${turn == 1 ? '' : 'faded'}`} onClick={() => colorChange('var(--green)', 1)} onMouseEnter={e => radarActive ? colorChange('var(--green)') : e.preventDefault()} style={{ background: 'var(--green)' }}></div>
          <div className={`color ${playerOneColor === 'var(--blue)' ? 'grayed' : ''} ${turn == 1 ? '' : 'faded'}`} onClick={() => colorChange('var(--blue)', 1)} onMouseEnter={e => radarActive ? colorChange('var(--blue)') : e.preventDefault()} style={{ background: 'var(--blue)' }}></div>
        </div>
        <div className='captureCounter'>
            <div className='fakeSquare one'>
                <h4>{oneCaptureCount}</h4>
            </div>
            <div className='fakeSquare two'>
                <h4>{twoCaptureCount}</h4>
            </div>
        </div>
      </section>
    </section>
    <section className='right'>
    <div className='scoreboard'>
      <h2>High Score: {highScore != null && highScore}</h2>
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
      </div>
      <div className={`options ${isOpen ? 'show' : ''}`}>
        <div className='gridView'>
          <h3>Grid View</h3>
          <input id='grid' type='checkbox' value='1px solid black' checked={grid} name='grid' onChange={handleGridToggle}></input>
          <label htmlFor='grid'>Grid</label>
        </div>
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
          </div>
          <div className='colorHolder' onClick={handlePaletteSwap}>
            <div className='palColor' style={{background: 'hsl(33, 90.8%, 12.7%)'}}></div>
            <div className='palColor' style={{background: 'hsl(33, 89.8%, 26.9%)'}}></div>
            <div className='palColor' style={{background: 'hsl(25, 95.4%, 42.7%)'}}></div>
            <div className='palColor' style={{background: 'hsl(221, 69.2%, 43.3%)'}}></div>
            <div className='palColor' style={{background: 'hsl(213, 68.6%, 90%)'}}></div>
          </div>
          <div className='colorHolder' onClick={handlePaletteSwap}>
            <div className='palColor' style={{background: 'hsl(2,72%,51%)'}}></div>
            <div className='palColor' style={{background: 'hsl(358,83%,35%)'}}></div>
            <div className='palColor' style={{background: 'hsl(211,88%,32%)'}}></div>
            <div className='palColor' style={{background: 'hsl(0,0%,39%)'}}></div>
            <div className='palColor' style={{background: 'hsl(0,0%,14%)'}}></div>
          </div>
          <div className='colorHolder' onClick={handlePaletteSwap}>
            <div className='palColor' style={{background: 'hsl(164,95%,43%)'}}></div>
            <div className='palColor' style={{background: 'hsl(240,100%,98%)'}}></div>
            <div className='palColor' style={{background: 'hsl(43,100%,70%)'}}></div>
            <div className='palColor' style={{background: 'hsl(197,19%,36%)'}}></div>
            <div className='palColor' style={{background: 'hsl(200,43%,7%)'}}></div>
          </div>
          <div className='colorHolder' onClick={handlePaletteSwap}>
            <div className='palColor' style={{background: 'hsl(7,55%,30%)'}}></div>
            <div className='palColor' style={{background: 'hsl(6,56%,49%)'}}></div>
            <div className='palColor' style={{background: 'hsl(24,38%,87%)'}}></div>
            <div className='palColor' style={{background: 'hsl(183,66%,28%)'}}></div>
            <div className='palColor' style={{background: 'hsl(180,20%,20%)'}}></div>
          </div>
          <div className='colorHolder' onClick={handlePaletteSwap}>
            <div className='palColor' style={{background: 'hsl(306, 81%, 21%)'}}></div>
            <div className='palColor' style={{background: 'hsl(327,100%,44%)'}}></div>
            <div className='palColor' style={{background: 'hsl(211,88%,32%)'}}></div>
            <div className='palColor' style={{background: 'hsl(0,0%,39%)'}}></div>
            <div className='palColor' style={{background: 'hsl(0,0%,14%)'}}></div>
          </div>
          <div className='colorHolder' onClick={handlePaletteSwap}>
            <div className='palColor' style={{background: 'hsl(83, 45%, 18%)'}}></div>
            <div className='palColor' style={{background: 'hsl(59,70%,30%)'}}></div>
            <div className='palColor' style={{background: 'hsl(55, 47%, 78%)'}}></div>
            <div className='palColor' style={{background: 'hsl(48,99%,59%)'}}></div>
            <div className='palColor' style={{background: 'hsl(27, 55%, 33%)'}}></div>
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
