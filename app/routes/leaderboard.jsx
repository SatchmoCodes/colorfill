import { json, redirect } from "@remix-run/node";
import { Form, Link, NavLink, Outlet, useActionData, useFetcher, useLoaderData } from "@remix-run/react";
import { useSubmit } from "@remix-run/react"


import { useState } from 'react'

import { useUser } from "~/utils";
import {prisma} from '~/db.server'
import { requireUserId } from "~/session.server";
import leaderboardstyles from '~/styles/leaderboard.css'
import  { getBestScore, getScoreList, getQueryResult, getUserQueryResult, getAllScores, highScores } from "../models/score.server";

let previousMode = 'Free Play'


export const loader = async ({ request }) => {
    const userId = await requireUserId(request)
    const url = new URL(request.url)
    console.log(url.searchParams)
    let scoreListItems = await getQueryResult({ gamemode: 'Free Play', size: 'Medium', order: 'asc' })
    if (url.searchParams == '') {
        
    }
    else {
        
        let size = url.searchParams.get('size')
        let order = 'asc'
        const gamemode = url.searchParams.get('gamemode')
        console.log(gamemode)
        console.log(previousMode)
        if (gamemode != previousMode) {
            console.log('hi')
            previousMode = gamemode
            if (gamemode == 'Free Play') {
                size = 'Medium'
            }
            else if (gamemode == 'Progressive') {
                size = '18'
            }
        }
        const username = url.searchParams.get('username')
        if (username) {
            scoreListItems = await getUserQueryResult({ username, gamemode, size, order})
        }
        else {
            scoreListItems = await getQueryResult({ gamemode, size, order })
        }
    }

    const bestSmallScore = await getBestScore({ userId, size: 'Small', gamemode: 'Free Play'  })
    const bestMediumScore = await getBestScore({ userId, size: 'Medium', gamemode: 'Free Play' })
    const bestLargeScore = await getBestScore({ userId, size: 'Large', gamemode: 'Free Play'  })
    const bestProgScore = await getBestScore({ userId, size: '18', gamemode: 'Progressive'  })
    const totalScores = await getAllScores({ userId })
    return json({ totalScores, scoreListItems, bestSmallScore, bestMediumScore, bestLargeScore, bestProgScore })
};

// export const action = async ({ request }) => {
//     const userId = await requireUserId(request);
//     const formData = await request.formData()
//     const gamemode = formData.get('gamemode')
//     const size = formData.get('size')
//     console.log(gamemode)
//     console.log(size)
//     const queryListItems = await getQueryResult({ gamemode })
//     // return redirect('/leaderboard')
//     return json({ queryListItems })
// }

let oldMode = 'Free Play'
let size

const leaderboard = () => {
    const data = useLoaderData()
    const user = useUser()
    const submit = useSubmit()

    const [gamemode, setGamemode] = useState('Free Play')

    function handleRedirect(event) {
        if (event.target.dataset.gamemode == 'Free Play') {
            window.location.href = `/game/${event.target.id}`
        }
        else if (event.target.dataset.gamemode == 'Progressive') {
            window.location.href = `/proggame/${event.target.id}`
        }
    }

    function handleChange(event) {
        console.log(event.currentTarget)
        event.target.name == 'gamemode' && setGamemode(event.target.value)
        submit(event.currentTarget)
      
    }
    
  return (
    <>
        <div className='link'>
          <Link to='/'>Return to Main Menu</Link>
        </div>
        <div className="personalStats">
            <h1>{user.username}</h1>
            <h2>Boards played: {data.totalScores.length}</h2>
            <h2>Best small board score: {data.bestSmallScore == null ? '' : data.bestSmallScore.score}</h2>
            <h2>Best medium board score: {data.bestMediumScore == null ? '' : data.bestMediumScore.score}</h2>
            <h2>Best large board score: {data.bestLargeScore == null ? '' : data.bestLargeScore.score}</h2>
            <h2>Best progressive score: {data.bestProgScore == null ? '' : data.bestProgScore.score}</h2> 
        </div>
        
        <div className="table">
            <div className="topRow">
                <h1>Global Leaderboard</h1>
            </div>
            <div className="row">
                <h2>Rank</h2>
                <h2>User</h2>
                <h2>Gamemode</h2>
                <h2 className="score">Score</h2>
                <h2>Board Size</h2>
                <h2>Board Code</h2>
            </div>
            <Form method='get' onChange={handleChange}>
                <div className="row filters">
                    <div>

                    </div>
                    <div>
                        <input className='username' type="text" name="username"></input>
                    </div>
                    <div>
                        <select className="gamemode" name="gamemode">
                            <option value='Free Play'>Free Play</option>
                            <option value='Progressive'>Progressive</option>
                            <option value='PVP'>Player Vs Player</option>
                        </select>
                    </div>
                    <div className="score">

                    </div>
                    <div>
                        {gamemode == 'Free Play' && <select className="size" name="size" defaultValue={'Medium'}>
                            <option>Small</option>
                            <option >Medium</option>
                            <option>Large</option>
                        </select>}
                        {gamemode == 'Progressive' && <select className="size" name="size" defaultValue={'18'}>
                            <option >18</option>
                        </select>}
                    </div>
                    <div>

                    </div>
                </div>
            </Form>
            <>
            {data.scoreListItems.length == 0 ? <div className="row empty"><h2>No results found</h2></div> : data.scoreListItems.map((score, index) => (
                <div className="row" key={score.id}>
                    <h2>{index + 1}</h2>
                    <h2>{score.userName}</h2>
                    <h2>{score.gamemode}</h2>
                    <h2 className="score">{score.gamemode == 'Progressive' && score.score > 0 ? '+' + score.score : score.score}</h2>
                    <h2>{score.boardSize}</h2>
                    <h2 className='playBoard' id={score.boardId} data-gamemode={score.gamemode} onClick={(event) => handleRedirect(event)}>Play this board</h2>
                </div>
            ))}
            </>
         
        </div>
        
    </>
  )
}

export default leaderboard

export function links() {
    return [{rel: 'stylesheet', href: leaderboardstyles}]
  }