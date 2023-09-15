class Square {
    constructor(rowIndex, colIndex, color, defaultColor, fakeColor, index) {
        this.rowIndex = rowIndex
        this.colIndex = colIndex
        this.color = color
        this.defaultColor = defaultColor
        this.fakeColor = fakeColor
        this.index = index
        this.captured = false
    }
}

const colors = ['var(--red)', 'var(--orange)', 'var(--yellow)', 'var(--green)', 'var(--blue)']

function generateBoard(colorString) {
    let dimensions = Math.sqrt(colorString.length)
    let squareArr = new Array(dimensions).fill(0).map((_, rowIndex) => new Array(dimensions).fill(0).map((_, colIndex) => ({ value: 0, rowIndex, colIndex })))
    let colorArr = []
    for (let x = 0; x < colorString.length; x++) {
        colorArr.push(colors[colorString[x]])
    }
    let i = 0
    squareArr.forEach(row => {
        row.forEach(({sq, rowIndex, colIndex}) => {
            let square = new Square(rowIndex, colIndex, colorArr[i], colorArr[i], colorArr[i], i)
            row.splice(colIndex, 1, square)
            i++
        })
    })
    squareArr[0][0].captured = true
    return squareArr
}

export default generateBoard


    
    
    
