
$(document).ready(function () {

    var img = new Image();
    img.src = 'https://file.mockplus.cn/webapp/project/pbEQpnK9A/fh29Zfums.png?v=1417696400000';
    img.onload = function() {
        var height = this.height,
            width = this.width;
        stage = new Kinetic.Stage({
            container: 'canvas',
            width: width,
            height: height
        });
        layer = new Kinetic.Layer();
        background = new Kinetic.Rect({
            x: 0,
            y: 0,
            height: height,
            width: width
        });
        layer.add(background);
        stage.add(layer);
    };
    var stage, layer, background;
    var strokeWidth = 3; //边框宽度
    var haveShowModuleArr = []; //记录已经执行步骤数组，即当前动作的前序动作
    var needShowModuleArr = []; //记录需要执行步骤数组，即当前动作的后续动作
    var operationStatus = 'painting'; //操作模式，分为拖动及绘画模式, 'drag' or 'painting'、'text'、'arrow'、'cycle'、'rect'

    /**
     *操作时，当前操作动作对象
     * @param type: 动作类型,
     *    drag: 代表当前动作是拖动元素; module: 代表当前动作为创建模块元素
     * @param node: 执行动作的模块;
     *    如果为拖动，则为拖动模块；如果为创建，则为当前创建模块
     * @param start: 拖动开始位置; 仅限于拖动动作使用
     * @param end: 拖动结束位置; 仅限于拖动动作使用
     * @type {{}}
     */
    var currentAction = {}; //操作时，当前操作动作对象

    /**
     * 画笔对象
     */
    var Paint = function () {
        var isMouseDown = false, points = [];
        this.onMousedown = function (event) {
            if (operationStatus !== 'painting' || event.target.nodeName !== 'CANVAS') {
                return;
            }
            isMouseDown = true;
            points = [];
            var pointerPos = stage.getPointerPosition();
            points.push(pointerPos.x);
            points.push(pointerPos.y);
            var line = new Kinetic.Line({
                points: points,
                stroke: "red",
                strokeWidth: strokeWidth,
                lineCap: 'round',
                lineJoin: 'round',
                name: 'module'
            });
            layer.add(line);
            addModuleDragAction(line);
            currentAction = {
                node: line,
                type: 'module'
            };
            haveShowModuleArr.push(currentAction);
            needShowModuleArr = [];
        };
        this.onMousemove = function (event) {
            if (!isMouseDown) {
                return;
            }
            isMouseDown = true;
            var pointerPos = stage.getPointerPosition();
            if(pointerPos) {
                points.push(pointerPos.x);
                points.push(pointerPos.y);
            }
            layer.draw();
        };
        this.onMouseup = function (event) {
            isMouseDown = false;
        };
    };
    /**
     *箭头对象
     */
    var Arrow = function () {
        var group, line, moving = false;
        this.onMousedown = function (event) {
            if (moving) {
                moving = false;
                layer.draw();
            } else {
                if(event.target.nodeName !== 'CANVAS') {return;}
                var mousePos = stage.getPointerPosition();
                group = new Kinetic.Group({
                    x: mousePos.x,
                    y: mousePos.y,
                    draggable: true
                });
                line = new Kinetic.Line({
                    points: [0, 0, 0, 0], //start point and end point are the same
                    stroke: 'red',
                    strokeWidth: strokeWidth,
                    name: 'module'
                });
                group.add(line);
                layer.add(group);
                moving = true;
                addModuleDragAction(line);
                currentAction = {
                    node: line,
                    type: 'module'
                };
                haveShowModuleArr.push(currentAction);
                needShowModuleArr = [];
            }
        };
        this.onMousemove = function (event) {
            if (!moving) {
                return;
            }
            var mousePos = stage.getPointerPosition();
            var x = mousePos.x - group.x();
            var y = mousePos.y - group.y();
            line.points()[2] = x;
            line.points()[3] = y;
            var fromx = line.points()[0];
            var fromy = line.points()[1];
            var tox = mousePos.x - group.x();
            var toy = mousePos.y - group.y();
            var headlen = 10;
            var angle = Math.atan2(toy - fromy, tox - fromx);
            line.points(
                [fromx,
                    fromy,
                    tox,
                    toy,
                    tox - headlen * Math.cos(angle - Math.PI / 6),
                    toy - headlen * Math.sin(angle - Math.PI / 6),
                    tox,
                    toy,
                    tox - headlen * Math.cos(angle + Math.PI / 6),
                    toy - headlen * Math.sin(angle + Math.PI / 6)]
            );
            moving = true;
            layer.drawScene();
        };
        this.onMouseup = function (event) {
            moving = false;
            layer.draw();
        }
    };
    /**
     * 圆对象
     * @constructor
     */
    var Cycle = function () {
        var cycle, startPos, moving = false;
        this.onMousedown = function (event) {
            if (moving) {
                moving = false;
                layer.draw();
            } else {
                if(event.target.nodeName !== 'CANVAS') {return;}
                startPos = stage.getPointerPosition();
                cycle = new Kinetic.Circle({
                    x: startPos.x,
                    y: startPos.y,
                    radius: 1,
                    stroke: 'red',
                    strokeWidth: strokeWidth,
                    name: 'module'
                });
                layer.add(cycle);
                moving = true;
                addModuleDragAction(cycle);
                currentAction = {
                    node: cycle,
                    type: 'module'
                };
                haveShowModuleArr.push(currentAction);
                needShowModuleArr = [];
            }
        };
        this.onMousemove = function (event) {
            if (!moving) {
                return;
            }
            var pointerPos = stage.getPointerPosition();
            var redius = Math.abs(pointerPos.x - startPos.x) > Math.abs(pointerPos.y - startPos.y) ?
            (pointerPos.x - startPos.x) / 2 : (pointerPos.y - startPos.y) / 2;
            cycle.radius(parseInt(Math.abs(redius)));
            if (pointerPos.x > startPos.x && pointerPos.y < startPos.y) {
                cycle.position({
                    x: startPos.x + parseInt(Math.abs(redius)),
                    y: startPos.y - parseInt(Math.abs(redius))
                });
            } else if (pointerPos.x < startPos.x && pointerPos.y > startPos.y) {
                cycle.position({
                    x: startPos.x - parseInt(Math.abs(redius)),
                    y: startPos.y + parseInt(Math.abs(redius))
                });
            } else {
                cycle.position({
                    x: startPos.x + parseInt(redius),
                    y: startPos.y + parseInt(redius)
                });
            }
            if (cycle.radius() >= 5) {
                layer.draw();
            }
            moving = true;
        };
        this.onMouseup = function (event) {
            moving = false;
            if (cycle.radius() < 5) {
                cycle.destroy();
            }
        };
    };

    /**
     * 方形对象
     * @constructor
     */
    var Rect = function () {
        var rect, startPos, moving = false;
        this.onMousedown = function (event) {
            if (moving) {
                moving = false;
                layer.draw();
            } else {
                if(event.target.nodeName !== 'CANVAS') {return;}
                startPos = stage.getPointerPosition();
                rect = new Kinetic.Rect({
                    x: startPos.x,
                    y: startPos.y,
                    width: 1,
                    height: 1,
                    stroke: 'red',
                    cornerRadius: 5,
                    strokeWidth: strokeWidth,
                    name: 'module'
                });
                layer.add(rect);
                moving = true;
                addModuleDragAction(rect);
                currentAction = {
                    node: rect,
                    type: 'module'
                };
                haveShowModuleArr.push(currentAction);
                needShowModuleArr = [];
            }
        };
        this.onMousemove = function (event) {
            if (!moving) {
                return;
            }
            var pointerPos = stage.getPointerPosition();
            var width = parseInt(pointerPos.x - startPos.x),
                height = parseInt(pointerPos.y - startPos.y);
            rect.width(Math.abs(width));
            rect.height(Math.abs(height));
            if (width < 0 && height < 0) {
                rect.position({
                    x: startPos.x + width,
                    y: startPos.y + height
                });
            } else if (width < 0) {
                rect.position({
                    x: startPos.x + width,
                    y: startPos.y
                });
            } else if (height < 0) {
                rect.position({
                    x: startPos.x,
                    y: startPos.y + height
                });
            }
            if (rect.width() >= 5 && rect.height() >= 5) {
                layer.draw();
            }
            moving = true;
        };
        this.onMouseup = function (event) {
            if(event.target.nodeName !== 'CANVAS') {return;}
            moving = false;
            if (rect.width() < 5 && rect.height() < 5) {
                rect.destroy();
            }
        };
    };

    var paint = new Paint();
    var arrow = new Arrow();
    var cycle = new Cycle();
    var rect = new Rect();

    /**
     * 添加节点模块拖动动作
     * 记住拖动前动作及拖动后动作
     */
    function addModuleDragAction(node) {
        /**
         * 添加节点dragstart动作
         */
        node.on('dragstart', function () {
            var node = this;
            currentAction = {
                type: 'drag',
                node: node,
                start: node.position()
            };
        });
        /**
         * 添加节点dragend动作
         */
        node.on('dragend', function () {
            var node = this;
            currentAction.end = node.position();
            haveShowModuleArr.push(currentAction);
        });
    }

    /**
     * 为canvas添加mouseDown事件
     */
    $('#canvas').on("mousedown", function (event) {
        if (operationStatus === 'painting') {
            paint.onMousedown(event);
        } else if (operationStatus === 'arrow') {
            arrow.onMousedown(event)
        } else if (operationStatus === 'cycle') {
            cycle.onMousedown(event);
        } else if (operationStatus === 'rect') {
            rect.onMousedown(event);
        }
    });

    /**
     * 为canvas添加mousemove事件
     */
    $('#canvas').on("mousemove", function (event) {
        if (operationStatus === 'painting') {
            paint.onMousemove(event);
        } else if (operationStatus === 'arrow') {
            arrow.onMousemove(event);
        } else if (operationStatus === 'cycle') {
            cycle.onMousemove(event);
        } else if (operationStatus === 'rect') {
            rect.onMousemove(event);
        }
    });

    /**
     * 为canvas添加mouseup事件
     */
    $('#canvas').on("mouseup", function (event) {
        if (operationStatus === 'painting') {
            paint.onMouseup(event);
        } else if (operationStatus === 'arrow') {
            arrow.onMouseup(event);
        } else if (operationStatus === 'cycle') {
            cycle.onMouseup(event);
        } else if (operationStatus === 'rect') {
            rect.onMouseup(event);
        }
    });

    /**
     * 为canvas添加click事件
     */
    $('.kineticjs-content').on("click", function (event) {
        if (operationStatus !== 'text') {
            return;
        }
        var offsetLeft = document.getElementById('review-paint-content').offsetLeft,
            offsetTop = document.getElementById('review-paint-content').offsetTop;
        var x = event.pageX - offsetLeft,
            y = event.pageY - offsetTop;
        $('input[type=text]').css({
            top: y + 'px',
            left: x + 'px'
        }).show().focus();
    });

    $('input[type=text]').blur(function (event) {
        var _this = this;
        var x = $(_this).position().left,
            y = $(_this).position().top;
        var text = new Kinetic.Text({
            text: $(_this).val(),
            x: x,
            y: y,
            fill: 'red',
            fontSize: 16,
            align: "center",
            name: 'module'
        });
        layer.add(text);
        layer.draw();
        addModuleDragAction(text);
        currentAction = {
            type: 'text',
            node: text
        };
        haveShowModuleArr.push(currentAction);
        $(_this).hide().val('');
    });

    //点击上一步 undo操作
    $('#lastStep').click(function () {
        var thisModule = haveShowModuleArr.pop();
        if (thisModule) {
            needShowModuleArr.push(thisModule);
            if (thisModule.type === 'module' || thisModule.type === 'text') {
                thisModule.node.hide();
            } else if (thisModule.type === 'drag') {
                thisModule.node.position(thisModule.start);
            }
            layer.draw();
        } else {
            console.log('已经到第一步了');
        }
    });

    //点击下一步 redo操作
    $('#nextStep').click(function () {
        var thisModule = needShowModuleArr.pop();
        if (thisModule) {
            haveShowModuleArr.push(thisModule);
            if (thisModule.type === 'module' || thisModule.type === 'text') {
                thisModule.node.show();
            } else if (thisModule.type === 'drag') {
                thisModule.node.position(thisModule.end);
            }
            layer.draw();
        } else {
            console.log('已经到最后一步了');
        }
    });

    //切换至拖动模式
    $('#drag').click(function () {
        operationStatus = 'drag';
        stage.get('.module').draggable(true);
    });

    //切换至绘画模式
    $('#print').click(function () {
        operationStatus = 'painting';
        stage.get('.module').draggable(false);
    });

    //切换至文本模式
    $('#text').click(function () {
        operationStatus = 'text';
    });

    //切换至箭头模式
    $('#arrow').click(function () {
        operationStatus = 'arrow';
    });

    //切换至圆模式
    $('#cycle').click(function () {
        operationStatus = 'cycle';
    });

    //切换至方形模式
    $('#rect').click(function () {
        operationStatus = 'rect';
    });

    //清除所有已经拥有数据
    $('#clearAll').click(function () {
        stage.get('.module').destroy();
        layer.draw();
        haveShowModuleArr = [];
        needShowModuleArr = [];
    });
});