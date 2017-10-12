"use strict";

var canvas = document.getElementById('gameField');
var context = document.getElementById('gameField').getContext('2d');

var $playBtn = $('#playBtn');

/* Перечисление возможных форм фигур */
var shape = {
    triangle: 1,
    square: 2,
    circle: 3
};

/* Флаговая переменная сообщающая загружены ли графические ресурсы */
var isSpriteLoad = false;
var isPlayBtnSprite = false;
var isPlaing = false;



/*-------------------------MAIN-------------------------------*/

var gameWorld = new World(8, 8, 75, 80, 150, canvas);
var gameController = new Controller(gameWorld, canvas);
var gameResource = new Resources(gameWorld, context);
gameResource.prepareResources();
var worldView = new View(canvas, context, gameWorld, gameResource);


$(canvas).one('click', function () {
    isPlaing = true;
    gameController.createWorld();
    gameController.worldUpdate();
});
/*
$playBtn.click(function (evnt) {
    $(this).hide();
    gameController.createWorld();
    gameController.worldUpdate();
});
*/



setInterval(function () {
        worldView.drawWorld();
    },
    20);

/* ---------------------обработчики событий---------------------- */

function mouseMoveHandler(event) {
    var x = event.pageX - canvas.offsetLeft;
    var y = event.pageY - canvas.offsetTop;

    gameWorld.gameFieldWatcher(x, y, gameWorld);

};


/*-------------------------Объект FIGURE-------------------------------*/

function Figure(x, y, type, figureColor) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.figureColor = figureColor;
    this.dropCount = 0;
    this.isMark = false;
    this.isFocus = false;
    this.isActive = false;
};

function FigureColor(fillColor, strokeColor) {
    this.fillColor = fillColor;
    this.strokeColor = strokeColor;
};

function FigureSet() {
    this.figures = [];
    this.addFigure = function (figure) {
        this.figures.push(figure);
    }
    this.getCenter = function () {
        return {left: this.figures[1].x, top: this.figures[1].y};
    } ;

    this.isVertical = function () {
        return false;
    }
};

/*-------------------------Фабрика фигур-------------------------------*/

function createFigure(x, y) {
    var x = x;
    var y = y;
    var randomType = 1 + Math.floor(Math.random() * 3);
    var randomColor = 1 + Math.floor(Math.random() * 3);
    var type;
    var figureColor;


    switch (randomType) {
        case 1:
            type = shape.triangle;
            break;
        case 2:
            type = shape.square;
            break;
        default:
            type = shape.circle
            break;
    }

    switch (randomColor) {
        case 1:
            figureColor = new FigureColor(gameResource.colorGreen, gameResource.colorDarkGreen);
            break;
        case 2:
            figureColor = new FigureColor(gameResource.colorBlue, gameResource.colorDarkBlue);
            break;
        default:
            figureColor = new FigureColor(gameResource.colorRed, gameResource.colorDarkRed);
            break;
    }

    return new Figure(x, y, type, figureColor);
}

/*   -----------Score -----------------   */

function ScorePart(score, isVertical, center) {
    this.score = score;
    this.isVertical = isVertical;
    this.center = center;
};

function ScoreSet(world){
    this.world = world;
    this.totalScore = 0;
    this.scores = [];

    this.createScores = function () {

        var completes = world.completeFigures;
        if (completes.length > 0) {
            for (var i = 0; i < completes.length; i++) {
               // var isVertical = completes[i].isVertical();
                var isVertical = false;
                var scorePart = this.countingScore(completes[i]);
               // var center = completes[i].getCenter();
                var center = {left: completes[i][1].x, top: completes[i][1].y};
                this.totalScore += scorePart;
                this.addScoreParts(new ScorePart(scorePart, isVertical, center));
            }
        }
    };

    /* Метод добаляющий  часть игрового счета (счет за успешнею фигуру) в общий массив очков*/
    this.addScoreParts = function (scorePart) {
        this.scores.push(scorePart);
    };

    /* Метод ведующи подсчет общего количесва очков */
    this.countingScore = function(figureSet) {
        var score = 10;
        if (figureSet.length > 3) {
            score += (figureSet.length - 3) * 10;
        }
        return score;
    };
};


/*-------------------CONTROLLER---------------*/

/* Объект представляющий собой Controller и модели Model View Controller*/
function Controller(world, canvas) {

    this.world = world;
    this.moveCount = 8;

    /* Метод производящий начальную инициализацию игрового мира*/
    this.createWorld = function () {
        world.fillWorld();
        world.score = 0;
        world.isGameOver = false;
    };
    /* Метод производящий поверхностную проверку игрового мира, на предмет того существуют ли собранные и готовые к сбросу фигуры
    * Выдает результат используемый для принятия решения о том стоит ли обновлять игровой мир*/
    this.fastCheckWorld = function () {
        world.checkRows();
        world.checkCols();
        world.createNew();
        this.moveCount = world.doCanDrop();
        if (this.moveCount > 0) {
            return true;
        } else {
            world.isUpdating = false;
            this.startInteractive(canvas);
            return false;
        }
    };

    /* Метод осуществляет отсроченную проверку игового мира на предмет того существуют ли собранные и готовые к сбросу фигуры*/
    this.checkWorld = function (delay, control) {
        var controller = control;
        var delay = delay;
        setTimeout(function () {
            world.checkRows();
            world.checkCols();
            world.createNew();
            controller.moveCount = world.doCanDrop();
        }, delay);
    }

    /* Сбрасывает собранные фигры, удаляя их с поля */
    this.сleaningWorld = function (delay) {
        setTimeout(function () {
            world.cleaning();
        }, delay);
    }

    /* Вызывается полсе сброс завершенных фигур, с целью заполнить образовашиеся в результате пустоты, фиграми находящимися выше */
    this.moveWorld = function () {
        world.move();
        world.completeFigures = [];
        world.gameScore.scores = [];
    };

    /* Этот метов вызывает метод moveWorld необходимео количество раз*/
    this.fullDrop = function (delay, interval, control) {

        var delay = delay;
        var interval = interval;
        var control = control;

        setTimeout(function () {
            if (control.moveCount > 0) {
                control.moveWorld();
                control.moveCount--;
                setTimeout(control.fullDrop, interval, 0, interval, control);
            } else {
                control.worldUpdate();
            }
        }, delay);

    }

    /* Метод полностью обновляет игровой мир */
    this.worldUpdate = function () {
        world.isUpdating = true;
        this.stopInteractive();

        world.stopWatch(null, {world: world});

        if (this.fastCheckWorld()) {
            this.сleaningWorld(400);
            this.fullDrop(800, 400, this);
        }
    }

    /* Метод активирует все обработчики пользовательских событий необходимых для управления игровым миром */
    this.startInteractive = function (canvas) {
        var world = this.world;
        var $canvas = $('canvas');

        $canvas.on('gameFieldEnter', world.beginWatch);
        $canvas.on('gameFieldLeave', world.stopWatch);
        $canvas.on('mouseleave', function () {
            if (world.isInGameField) {
                $canvas.trigger('gameFieldLeave', {world: world});
            }
        });

        $canvas.on('mousedown', function () {
            world.isHold = true;
            if (world.floatingFigure) {
                world.swapingFigures(world.dragingFigure, world.focusFigure);
            }
            if (world.focusFigure) {
                world.dragingFigure = world.focusFigure;
                world.activateFigure(world.dragingFigure);
            }
        });
        $canvas.on('mouseup', this, function (event) {
            world.isHold = false;
            if (world.dragingFigure) {
                world.disativateFigure(world.dragingFigure);
                world.dragingFigure = null;
            }
            if (world.floatingFigure) {
                world.disativateFigure(world.floatingFigure);
                world.floatingFigure = null;
            }

            if (world.isCanSwap) {
                world.swapingFigures();
                event.data.worldUpdate();
            }
        });

        $canvas.on('mousemove', mouseMoveHandler);

    };

    /* Метод дезактивирует все обработчики пользовательских событий необходимых для управления игровым миром */
    this.stopInteractive = function (canvas) {
        var $canvas = $('canvas');
        $canvas.off();
    };

};

/*-------------------------Объект WORLD-------------------------------*/

function World(width, height, scale, offset_x, offset_y, canvas) {
    /* шинира и высот игрового поля в фигурах */
    this.width = width;
    this.height = height;

    //this.canvas = canvas;

    /* Счет игры */
    this.gameScore = new ScoreSet(this);

    //this.scoreParts = [];

    /* флаг окончания игры */
    this.isGameOver = false;

    /* флаг сообщающий находится ли игра в состоянии обновления */
    this.isUpdating = false;

    /* смещение игрового поля относительно левой верхней точки канваса */
    this.offset_x = offset_x;
    this.offset_y = offset_y;

    /* масштаб 1 игровой клетки */
    this.scale = scale;

    /* флаг сообщающий о существовании в данных момент перетаскиваемой фигуры */
    this.isFigureBuilding = false;

    /* флаг необходимый при анализе строк и столбцов на выявление повторящихся фигур. */
    this.isHolesBuilding = false;

    this.isHold = false;

    /* флаг говорящий можно ли поменять 2 фигуры местами */
    this.isCanSwap = false;

    /* флаг сообщающий о том, находится ли курсор мыши в пределах игрового поля */
    this.isInGameField = false;

    /* двухмерный массив представляющий все фигуры игрового поля */
    this.gameField = [];

    /* временая фигура, необходима для анализа повторяющихся последовательнотей */
    this.tempFigure = [];

    /* массив из 2х фигур которые можно поменять местами */
    this.swampList = [];
    this.completeFigures = [];

    /* Фигура находящаяся в данный момент в фокусе (например под курсором мыши) */
    this.focusFigure;
    /* Фигура находящаяся в данный момент в состоянии перетаскивания */
    this.dragingFigure;
    /* Фигура находящаяся в данный момент как бы приклеенной к курсору мыши, свидетельсвуя о ее перетаскивании */
    this.floatingFigure;
    /* Фигура являющаяся потенциальной целью для обмена с перетаскиваемой */
    this.targetFigure;

    /* Метод заполняющий игровое поле */
    this.fillWorld = function () {
        for (var i = 0; i < this.width; i++) {
            this.gameField.push([]);
            for (var j = this.height - 1; j >= 0; j--) {
                this.gameField[i].push(createFigure(i, j));
            }
        }
    };

    /* Метод построчно проверяет игровое поле слева направо. Ищет повторящиеся последовательности фигур
    * Найдя комбинации из 2 и более одинаковых фигур отправляет из методу processFigure для дальнейшего анализа*/
    this.checkRows = function () {
        for (var j = height - 1; j >= 0; j--) {
            for (var i = 0; i < this.width - 1; i++) {
                if (this.gameField[i][j].type === this.gameField[i + 1][j].type &&
                    this.gameField[i][j].figureColor.fillColor == this.gameField[i + 1][j].figureColor.fillColor) {
                    if (!this.isFigureBuilding) {
                        this.tempFigure.push(this.gameField[i][j]);
                        this.isFigureBuilding = true;
                    }
                    this.tempFigure.push(this.gameField[i + 1][j]);
                } else {
                    if (this.isFigureBuilding) {
                        this.processFigure();
                        this.isFigureBuilding = false;
                    }
                }
            }

            this.processFigure();
            this.isFigureBuilding = false;

        }
    };

    /* Метод проверяет игровое поле столбец за столбцом сверху вниз. Ищет повторящиеся последовательности фигур
    * Найдя комбинации из 2 и более одинаковых фигур отправляет из методу processFigure для дальнейшего анализа*/
    this.checkCols = function () {
        for (var i = 0; i < this.width; i++) {
            for (var j = this.height - 1; j > 0; j--) {
                if (this.gameField[i][j].type === this.gameField[i][j - 1].type &&
                    this.gameField[i][j].figureColor.fillColor == this.gameField[i][j - 1].figureColor.fillColor) {
                    if (!this.isFigureBuilding) {
                        this.tempFigure.push(this.gameField[i][j]);
                        this.isFigureBuilding = true;
                    }
                    this.tempFigure.push(this.gameField[i][j - 1]);
                } else {
                    if (this.isFigureBuilding) {
                        this.processFigure();
                        this.isFigureBuilding = false;
                    }
                }
            }
            this.processFigure();
            this.isFigureBuilding = false;
        }
    };

    /* Метод поучает конбинации из повторяющихся фигур от методов checkКщцы и checkCols и проверяет их длину.
    * Если длина больше 3-х элементов фигуры составлющие последовательность активируются, для визуального выделения
    * и маркируются для последующего сброса, начисления игрвых очков и создания новых, замещающих фигур */
    this.processFigure = function () {
        if (this.tempFigure.length >= 3) {
            for (var i = 0; i < this.tempFigure.length; i++) {
                this.tempFigure[i].isActive = true;
                this.tempFigure[i].isFocus = true;
                this.tempFigure[i].isMark = true;
            }
            this.addCompleteFigure(this.tempFigure);
            this.tempFigure = [];
        } else {
            this.tempFigure = [];
        }
    };

    /* Метод добавляет успешную собранную фигуру в "карту успешно собранных фигур" обновляемую при каждом обновлении мира  */
    this.addCompleteFigure = function (newFigures) {
        var completes = this.completeFigures;
        if (completes.length > 0) {
            for (var i = 0; i < newFigures.length; i++) {
                for (var a = 0; a < completes.length; a++) {
                    for (var b = 0; b < completes[a].length; b++) {
                        if (newFigures[i] == completes[a][b]) {
                            for (var x = 0; x < newFigures.length; x++) {
                                if (x === i) continue;
                                completes[a].push(newFigures[x]);
                            }
                            return;
                        }
                    }
                }

            }
        }
        this.completeFigures.push(newFigures);
    };


    /* Метод определяющий является ли фигура вертикальной */
    this.isVerticalFigureSet = function (figureSet) {
        for (var i = 1; i < figureSet.length; i++) {
            if (figureSet[0].y !== figureSet[i].y) {
                return false;
            }
        }
        return true;
    };
    /* Метод возворащающий центр фигуры в виде объекта */
    this.getCenterOfFigureSet = function (figureSet) {
        return {left: figureSet[1].x, top: figureSet[1].y};
    };

    /* Метод прочесывает игровое поле и удаляет из него все "помеченные" фигуры */
    this.cleaning = function () {
        for (var i = 0; i < this.width; i++) {
            this.gameField[i] = this.gameField[i]
                .filter(
                    function (figure) {
                        if (figure.isMark) {
                            return false;
                        }
                        return true;
                    });
        }

    };

    /* Метод устанавливает для каждой фигуры необходимое количество движений вниз, для заполнения пустот оставшихся
      * после "сброса" успешно собранных фигур */
    this.doCanDrop = function () {
        var count = 0;
        var maxCount = 0;

        //this.createScores();
        //this.score.createScores();

        this.gameScore.createScores();

        for (var i = 0; i < this.width; i++) {
            for (var j = 0; j < this.gameField[i].length; j++) {

                if (this.gameField[i][j].isMark) {
                    if (!this.isHolesBuilding) {
                        this.isHolesBuilding = true;
                        // count = 0;
                    }

                    count++;

                    if (count > maxCount) {
                        maxCount = count;
                    }

                } else {
                    if (this.isHolesBuilding) {
                        this.isHolesBuilding = false;
                    }
                    if (count > 0) {
                        this.gameField[i][j].dropCount = count;
                    }
                }
            }
            this.isHolesBuilding = false;
            count = 0;
        }
        return maxCount;
    };

    this.move = function () {
        for (var i = 0; i < this.width; i++) {
            for (var j = 0; j < this.gameField[i].length; j++) {
                var figure = this.gameField[i][j];
                if (figure && this.gameField[i][j].dropCount > 0) {      //Лишнее условие
                    figure.y++;
                    figure.dropCount--;
                }
            }
        }
    };

    /* Метод создает новые фигуры в каждом столбце, взамен удачно "сброшенных" */
    this.createNew = function () {

        for (var i = 0; i < this.width; i++) {
            var count = 0;
            var figure = this.gameField[i];
            for (var j = 0; j < this.height; j++) {
                if (figure[j].isMark) {
                    // this.score += 10;
                    count++;
                }
            }

            for (var k = 1; k < (count + 1); k++) {
                figure.push(createFigure(i, -k));
            }
        }
    };

    this.changeFigure = function (figure, newType, newFigureColor) {
        figure.type = newType;
        figure.figureColor = newFigureColor;
    };

    this.gameFieldWatcher = function (x, y, world) {
        if (x > this.offset_x &&
            y > this.offset_y &&
            x < this.offset_x + this.scale * this.width &&
            y < this.offset_y + this.scale * this.height) {

            var fieldX = Math.floor(x - this.offset_x);
            var fieldY = Math.floor(y - this.offset_y);

            this.isInGameField = true;
            $(canvas).trigger('gameFieldEnter', {coordX: fieldX, coordY: fieldY, world: world});


        } else if (this.isInGameField) {
            this.isInGameField = false;
            $(canvas).trigger('gameFieldLeave', {world: world});

        }
    };

    this.beginWatch = function (event, staff) {
        var x = staff.coordX;
        var y = staff.coordY;
        var world = staff.world;

        var i = Math.floor(x / world.scale);
        var j = Math.floor(y / world.scale);
        var jTarnslate = (world.height - 1) - j;

        world.focusFigure = world.focusFigure || world.gameField[i][jTarnslate];
        world.focusFigure.isFocus = true;

        if (world.dragingFigure) {
            if (!world.floatingFigure) {
                world.floatingFigure = world.createFloatingFigure(world);
                world.activateFigure(world.floatingFigure);
            }
            world.floatingFigure.x = (x - (world.scale / 2)) / world.scale;
            world.floatingFigure.y = (y - (world.scale / 2)) / world.scale;
        }

        if (world.floatingFigure) {
            if (Math.abs(world.dragingFigure.x - world.floatingFigure.x) > 2 ||
                Math.abs(world.dragingFigure.y - world.floatingFigure.y) > 2) {
                world.disativateFigure(world.floatingFigure);
                world.disativateFigure(world.dragingFigure);
                world.floatingFigure = null;
                world.dragingFigure = null;
                world.swampList = [];
                world.isCanSwap = false;
            }
        }

        if (!(world.focusFigure.x == i && world.focusFigure.y == j)) {
            world.focusFigure.isFocus = false;
            world.focusFigure = world.gameField[i][jTarnslate];

            if (world.floatingFigure) {
                if (world.canSwap(world.dragingFigure, world.focusFigure)) {
                    world.isCanSwap = true;
                    world.swampList = [];
                    world.swampList.push(world.dragingFigure);
                    world.swampList.push(world.focusFigure);
                } else {
                    world.isCanSwap = false;
                    world.swampList = [];
                }
            }
        }
    };

    /* Метод создающий "парящую" фигуру при перетаскивании */
    this.createFloatingFigure = function (world) {
        return new Figure(world.dragingFigure.x, world.dragingFigure.y,
            world.dragingFigure.type,
            new FigureColor(world.dragingFigure.figureColor.fillColor,
                world.dragingFigure.figureColor.strokeColor));
    };

    /* Метод удаляющий все временные фигуры, такие как фокусная, активная, плавующая.
    * курсора из пределов игрового поля */
    this.stopWatch = function (event, staff) {

        var world = staff.world;

        if (world.focusFigure) {
            world.disativateFigure(world.focusFigure);
            world.focusFigure = null;
        }
        if (world.dragingFigure) {
            world.disativateFigure(world.dragingFigure);
            world.dragingFigure = null;
        }
        if (world.floatingFigure) {
            world.disativateFigure(world.floatingFigure)
            world.floatingFigure = null;
        }
        world.swampList = [];
        world.isCanSwap = false;
    };

    this.destroyFigure = function (figure) {
        figure.isFocus = false;
        figure.isActive = false;
        figure = null;
    };

    this.disativateFigure = function (figure) {
        figure.isFocus = false;
        figure.isActive = false;
    };

    this.activateFigure = function (figure) {
        figure.isFocus = true;
        figure.isActive = true;
    };

    /* Метод меняющий две фигуры местами */
    this.swapingFigures = function () {
        if (this.swampList.length > 1) {
            var figure1 = this.swampList[0];
            var figure2 = this.swampList[1]

            var tempType = figure1.type;
            var tempColor = figure1.figureColor;

            figure1.type = figure2.type;
            figure1.figureColor = figure2.figureColor;

            figure2.type = tempType;
            figure2.figureColor = tempColor;

            this.isCanSwap = false;
            this.swampList = [];
        }
    };

    /* Метод определяющий могут ли 2 фигуры поменяться местами */
    this.canSwap = function (figure1, figure2) {
        if (figure1.x == figure2.x && figure1.y == figure2.y) {
            return false;
        }
        if (Math.abs(figure1.x - figure2.x) > 1 ||
            Math.abs(figure1.y - figure2.y) > 1) {
            return false;
        }

        return true;
    };

};

/*---------------------Объект VIEW-----------------*/

/* View составляющая паттерна Model View Controller. отвечает за отрисовку игрового мира и все его объектов */
function View(canvas, context, world, resources) {

    this.canvas = canvas;
    this.context = context;
    this.world = world;
    this.resources = resources;

    /* Метод рисующий игровое поле */
    this.drawField = function (canvas, context, world) {
        context.clearRect(0, 0, canvas.width, canvas.height);
        this.drawTitles(canvas, context, world);
        this.drawBgTiles(canvas, context, world);
        if(!isPlaing)
            this.drawPlayBtn(canvas, context);
    };

    /* Метод рисующий плитки-подложки для игровых фигурок */
    this.drawBgTiles = function (canvas, context, world) {
        var resources = this.resources;
        var reduce = world.scale / 40;
        var scale = world.scale;

        context.shadowColor = "black";
        context.shadowBlur = 5;
        context.shadowOffsetX = 2;
        context.shadowOffsety = 2;

        if (isSpriteLoad) {
            for (var i = 0; i < world.width; i++) {
                for (var j = 0; j < world.height; j++) {
                    context.drawImage(resources.gemsSprite,
                        resources.tileXBegin, resources.tileYBegin,
                        resources.tileSize, resources.tileSize,
                        (i * scale + reduce) + world.offset_x,
                        (j * scale + reduce) + world.offset_y,
                        resources.tileSize - reduce * 2, resources.tileSize - reduce * 2);
                }
            }
        }
    };

    /* Метод рисующий игровые фигурки в виде картинок */
    this.drawGem = function (canvas, context, figure, world) {
        var resources = this.resources;
        context.shadowColor = "transparent";
        var reduce = this.getFigureReduce(figure);
        var scale = world.scale;
        var line = 0;
        var row = 0;
        var focusDx = 0;
        var focusDy = 0;

        switch (figure.type) {
            case shape.square:
                line = 0;
                break;
            case  shape.circle:
                line = 1;
                break;
            default:
                line = 2;
                break;
        }

        switch (figure.figureColor.fillColor) {
            case resources.colorRed:
                row = 0;
                break;
            case resources.colorBlue:
                row = 1;
                break;
            default:
                row = 2;
                break;
        }

        if (figure.isFocus) {
            focusDx = this.resources.focuseFigureDx;
            focusDy = this.resources.focuseFigureDx;
        }


        if (isSpriteLoad) {
            context.drawImage(resources.gemsSprite,
                row * resources.gemWidth,
                line * resources.gemHeight,
                resources.gemWidth,
                resources.gemHeight,
                (figure.x * scale + reduce + focusDx) + world.offset_x,
                (figure.y * scale + reduce + focusDy) + world.offset_y,
                scale - reduce * 2,
                scale - reduce * 2);
        }

    };

    /* Метод устанавливает толщину линии обводки для фигур в режиме рисования геометрических фигур */
    this.setFigureLineWidth = function (context, figure) {
        if (figure.isFocus)
            context.lineWidth = this.resources.focuseFigureStrokeWidth;
        else
            context.lineWidth = this.resources.figureStrokeWidth;
    };

    /* Метод возвращающий коэффициент уменьшения фигуры при ее активации */
    this.getFigureReduce = function (figure) {
        if (figure.isActive)
            return this.resources.activeFigureReduce;
        else
            return this.resources.figureReduce;
    };

    /* Метод рисующий игрове фигуры в виде кржков с обводкой */
    this.drawCircle = function (canvas, context, figure, world) {
        var reduce = this.getFigureReduce(figure);
        var scale = world.scale;

        context.fillStyle = figure.figureColor.fillColor;
        context.strokeStyle = figure.figureColor.strokeColor;

        context.shadowColor = "black";
        context.shadowBlur = 5;
        context.shadowOffsetX = 2;
        context.shadowOffsety = 2;

        this.setFigureLineWidth(context, figure);

        context.beginPath();

        context.arc((figure.x * scale + scale / 2) + world.offset_x,
            (figure.y * scale + scale / 2) + world.offset_y,
            (scale - reduce * 2) / 2,
            0, 2 * Math.PI);

        context.fill();
        context.stroke();

    };

    /* Метод рисующий игрове фигуры в виде квадратов с обводкой */
    this.drawSquare = function (canvas, context, figure, world) {
        var reduce = this.getFigureReduce(figure);
        var scale = world.scale;
        context.fillStyle = figure.figureColor.fillColor;
        context.strokeStyle = figure.figureColor.strokeColor;

        context.shadowColor = "black";
        context.shadowBlur = 5;
        context.shadowOffsetX = 2;
        context.shadowOffsety = 2;

        context.lineJoin = "bevel";

        this.setFigureLineWidth(context, figure);

        context.fillRect((figure.x * scale + reduce) + world.offset_x,
            (figure.y * scale + reduce) + world.offset_y,
            scale - (reduce * 2),
            scale - (reduce * 2));
        context.strokeRect((figure.x * scale + reduce) + world.offset_x,
            (figure.y * scale + reduce) + world.offset_y,
            scale - (reduce * 2),
            scale - (reduce * 2));
    };

    /* Метод рисующий игрове фигуры в виде треугольников с обводкой */
    this.drawTriangle = function (canvas, context, figure, world) {
        var reduce = this.getFigureReduce(figure);
        var scale = world.scale;
        context.fillStyle = figure.figureColor.fillColor;
        context.strokeStyle = figure.figureColor.strokeColor;

        context.shadowColor = "black";
        context.shadowBlur = 5;
        context.shadowOffsetX = 2;
        context.shadowOffsety = 2;

        context.lineJoin = "bevel";

        this.setFigureLineWidth(context, figure);

        context.beginPath();

        context.moveTo(((figure.x * scale) + reduce) + world.offset_x,
            ((figure.y * scale) + (scale - reduce)) + world.offset_y);
        context.lineTo((figure.x * scale + (scale / 2)) + world.offset_x,
            ((figure.y * scale) + reduce) + world.offset_y);
        context.lineTo(((figure.x * scale) + (scale - reduce)) + world.offset_x,
            (figure.y * scale + (scale - reduce)) + world.offset_y);
        context.closePath();

        context.fill();
        context.stroke();

    };

    /* Метод рисующий игрове фигуры в виде геометических фигур в зависимости от их типа */
    this.drawFigure = function (canvas, context, figure, world) {
        switch (figure.type) {
            case 1:
                this.drawTriangle(canvas, context, figure, world);
                break;
            case 2:
                this.drawSquare(canvas, context, figure, world);
                break;
            default:
                this.drawCircle(canvas, context, figure, world);
                break;
        }
    };

    /* Метод занимается отрисовкой мира */
    this.drawWorld = function () {
        this.drawField(this.canvas, this.context, this.world);
        if (isPlaing) {
            for (var i = 0; i < this.world.width; i++)
                for (var j = 0; j < this.world.height; j++) {
                    var figure = this.world.gameField[i][j];
                    if (figure && figure.y >= 0) {
                        this.drawGem(this.canvas, this.context, figure, this.world);
                        //this.drawFigure(this.canvas, this.context, figure, this.world);
                    }
                }
            if (this.world.floatingFigure) {
                this.drawGem(this.canvas, this.context, this.world.floatingFigure, this.world);
                //this.drawFigure(this.canvas, this.context, this.world.floatingFigure, this.world);
            }
            if (this.world.gameScore.scores.length > 0)
                this.drawScoreParts(this.canvas, this.context, this.world);
        }

    };

    /* Метод рисующий очики набранные за сбор каждой из фигур */
    this.drawScoreParts = function (canvas, context, world) {
        var scale = world.scale;
        var scores = world.gameScore.scores;
        var textSize = scale - 20;
        var textDy = textSize;

        context.fillStyle = this.resources.goldenGradient;

        context.strokeStyle = "black";
        context.textAlign = "center";
        context.font = "bold " + textSize + "px" + " Arial";


        for (var i = 0; i < scores.length; i++) {
            context.fillText(scores[i].score,
                ((scores[i].center.left * scale) + (scale / 2)) + world.offset_x,
                ((scores[i].center.top * scale) + (textDy)) + world.offset_y);
            context.strokeText(scores[i].score,
                ((scores[i].center.left * scale) + (scale / 2)) + world.offset_x,
                ((scores[i].center.top * scale) + (textDy)) + world.offset_y);

        }

    };

    /* Метод рисующий заголовок и счет игры */
    this.drawTitles = function (canvas, context, world) {

        context.fillStyle = this.resources.colorRed;
        context.lineWidth = 1;
        context.textAlign = "left";
        context.font = "3.2em Germania One";

        context.fillText("Super Gems",
            90, 90);
        context.font = "2em Germania One";
        context.fillText("Scores: " + world.gameScore.totalScore,
            490, 90);
    };

    this.drawPlayBtn = function (canvas, context) {
        if (isPlayBtnSprite) {
            context.drawImage(resources.playSprite,
                (canvas.width / 2) - (resources.playSprite.width / 2),
                (canvas.height / 2) - (resources.playSprite.height / 2));
        }
    }
};


/*---------RESOURCES-----------------------*/

/* Объект ресурсов игры */
function Resources(world, context) {

    this.world = world;
    this.context = context;

    this.isSpriteLoad = false;
    this.gemsSprite = new Image();
    this.playSprite = new Image();
    this.gemHeight = 54;
    this.gemWidth = 54;
    this.tileSize = 71;
    this.tileXBegin = 0;
    this.tileYBegin = 162;
    this.colorGreen = "#49c72b";
    this.colorDarkGreen = "#1c5017";
    this.colorBlue = "#436fda";
    this.colorDarkBlue = "#061642";
    this.colorRed = "#DA1D0D";
    this.colorDarkRed = "#420F0A";
    this.colorOne = "#cba983";
    this.colorTwo = "#e89878";
    this.goldenGradient;

    this.figureReduce = 0;
    this.activeFigureReduce = 0;
    this.figureStrokeWidth = 0;
    this.focuseFigureStrokeWidth = 0;
    this.focuseFigureDx = 0;

    /* Метод настраивающий и загружающий ресурсы */
    this.prepareResources = function () {
        this.figureReduce = this.world.scale / 10;
        this.activeFigureReduce = this.world.scale / 5;
        this.figureStrokeWidth = this.world.scale / 20;
        this.focuseFigureStrokeWidth = this.world.scale / 10;
        this.focuseFigureDx = -this.world.scale / 15;

        this.gemsSprite.src = "images/gems.png";
        this.playSprite.src = "images/play.png";

        this.gemsSprite.onload = function () {
            isSpriteLoad = true;
        };

        this.playSprite.onload = function () {
            isPlayBtnSprite = true;
        };

        this.goldenGradient = this.context.createLinearGradient(this.world.offset_x, this.world.offset_y,
            this.world.offset_x + this.world.width * this.world.scale,
            this.world.offset_y + this.world.height * this.world.scale);
        this.goldenGradient.addColorStop(0.05, "orange");
        this.goldenGradient.addColorStop(0.1, "yellow");
        this.goldenGradient.addColorStop(0.15, "orange");
        this.goldenGradient.addColorStop(0.2, "yellow");
        this.goldenGradient.addColorStop(0.25, "orange");
        this.goldenGradient.addColorStop(0.3, "orange");
        this.goldenGradient.addColorStop(0.35, "yellow");
        this.goldenGradient.addColorStop(0.4, "orange");
        this.goldenGradient.addColorStop(0.45, "yellow");
        this.goldenGradient.addColorStop(0.5, "orange");
        this.goldenGradient.addColorStop(0.55, "orange");
        this.goldenGradient.addColorStop(0.6, "yellow");
        this.goldenGradient.addColorStop(0.65, "orange");
        this.goldenGradient.addColorStop(0.7, "yellow");
        this.goldenGradient.addColorStop(0.75, "orange");
        this.goldenGradient.addColorStop(0.8, "orange");
        this.goldenGradient.addColorStop(0.85, "yellow");
        this.goldenGradient.addColorStop(0.9, "orange");
        this.goldenGradient.addColorStop(0.95, "yellow");
        this.goldenGradient.addColorStop(1.0, "orange");

    };
};

