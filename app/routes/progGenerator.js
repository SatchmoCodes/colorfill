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
    let i = 0
    let fullArr = []
    let colorArr = []
    for (let x = 0; x < colorString.length; x++) {
        colorArr.push(colors[colorString[x]])
    }
    for (let y = 5; y < 23; y++) {
        let dimensions = y
        i = 0
        let squareArr = new Array(dimensions).fill(0).map((_, rowIndex) => new Array(dimensions).fill(0).map((_, colIndex) => ({ value: 0, rowIndex, colIndex })))
        squareArr.forEach(row => {
            row.forEach(({sq, rowIndex, colIndex}) => {
                let square = new Square(rowIndex, colIndex, colorArr[i], colorArr[i], colorArr[i], i)
                row.splice(colIndex, 1, square)
                i++
            })
        })
        squareArr[0][0].captured = true
        fullArr.push(squareArr.flat())
    }
    return fullArr
}

export default generateBoard