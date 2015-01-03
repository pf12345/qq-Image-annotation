(function () {
    'use strict';
    /**
     * 使用方式:
     * <div ng-show="showPaint" paint img-src="{{cfpAngularReviewProvider.config.file.imagePath}}"></div>
     */
    angular.module('angular-paint', ['angularPaint']);

    angular.module('angularPaint', []).run(["$rootScope", "$timeout", function ($rootScope, $timeout) {
        $rootScope.image = {};
        $rootScope.paintCanvas = {
            strokeWidth: 3, //边框宽度
            fontSize: 14,
            fontFamily: "microsoft yahei",
            haveShowModuleArr: [], //记录已经执行步骤数组，即当前动作的前序动作
            needShowModuleArr: [], //记录需要执行步骤数组，即当前动作的后续动作
            operationStatus: 'painting', //操作模式，分为拖动及绘画模式, 'drag' or 'painting'、'text'、'arrow'、'cycle'、'rect'
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
            currentAction: {} //操作时，当前操作动作对象
        };

        /**
         * 画笔对象
         */
        var Paint = function () {
            var isMouseDown = false, points = [];
            var variables = $rootScope.paintCanvas;
            this.onMousedown = function (event) {
                if (variables.operationStatus !== 'painting' || event.target.nodeName !== 'CANVAS') {
                    return;
                }
                points = [];
                var pointerPos = variables.stage.getPointerPosition();
                if (!pointerPos) return;
                isMouseDown = true;
                points.push(pointerPos.x);
                points.push(pointerPos.y);
                var line = new Kinetic.Line({
                    points: points,
                    stroke: variables.defaultColor["background-color"],
                    strokeWidth: variables.strokeWidth,
                    lineCap: 'round',
                    lineJoin: 'round',
                    name: 'module',
                    tag: 'paint'
                });
                variables.layer.add(line);
                addModuleDragAction(line);
                variables.currentAction = {
                    node: line,
                    type: 'module'
                };
                variables.haveShowModuleArr.push(variables.currentAction);
                variables.needShowModuleArr = [];
            };
            this.onMousemove = function (event) {
                if (!isMouseDown) {
                    return;
                }
                isMouseDown = true;
                var pointerPos = variables.stage.getPointerPosition();
                if (!pointerPos) {
                    pointerPos = {};
                    var node = document.getElementById("canvas").getElementsByTagName("canvas")[0];
                    var x = angular.element(node).offset().left;
                    var y = angular.element(node).offset().top;
                    pointerPos.x = event.pageX - x;
                    pointerPos.y = event.pageY - y;
                }
                if (pointerPos) {
                    points.push(pointerPos.x);
                    points.push(pointerPos.y);
                }
                variables.layer.draw();
            };
            this.onMouseup = function (event) {
                isMouseDown = false;
            };
        };
        /**
         *箭头对象
         */
        var Arrow = function () {
            var group, line, moving = false, rect, lineLength = 0, angle;
            var variables = $rootScope.paintCanvas;
            var halfStrokeWidth = $rootScope.paintCanvas.strokeWidth / 2;
            this.onMousedown = function (event) {
                lineLength = 0;
                if (moving) {
                    moving = false;
                    variables.layer.draw();
                } else {
                    if (event.target.nodeName !== 'CANVAS') {
                        return;
                    }
                    var mousePos = variables.stage.getPointerPosition();
                    group = new Kinetic.Group({
                        x: mousePos.x,
                        y: mousePos.y,
                        name: 'module',
                        tag: 'arrow'
                    });
                    line = new Kinetic.Line({
                        points: [0, 0, 0, 0], //start point and end point are the same
                        stroke: variables.defaultColor["background-color"],
                        strokeWidth: variables.strokeWidth
                    });
                    rect = new Kinetic.Rect({
                        width: halfStrokeWidth * 8,
                        x: -halfStrokeWidth * 4,
                        y: 0,
                        height: 0
                    });
                    group.add(line).add(rect);
                    variables.layer.add(group);
                    moving = true;
                    addModuleDragAction(group);
                    variables.currentAction = {
                        node: group,
                        type: 'module'
                    };
                    variables.haveShowModuleArr.push(variables.currentAction);
                    variables.needShowModuleArr = [];
                }
            };
            this.onMousemove = function (event) {
                if (!moving) {
                    return;
                }
                var mousePos = variables.stage.getPointerPosition();
                if (!mousePos) {
                    mousePos = getOutPos(event);
                }
                var x = mousePos.x - group.x();
                var y = mousePos.y - group.y();
                line.points()[2] = x;
                line.points()[3] = y;
                var fromx = line.points()[0];
                var fromy = line.points()[1];
                var tox = mousePos.x - group.x();
                var toy = mousePos.y - group.y();
                var headlen = 10 + halfStrokeWidth * 2;
                angle = Math.atan2(toy - fromy, tox - fromx);
                lineLength = (toy - fromy) / Math.sin(angle);
                line.points(
                    [
                        fromx,
                        fromy,
                        tox,
                        toy,
                        tox - Math.cos(angle) * halfStrokeWidth,
                        toy - Math.sin(angle) * halfStrokeWidth,
                        tox - headlen * Math.cos(angle - Math.PI / 6),
                        toy - headlen * Math.sin(angle - Math.PI / 6),
                        tox - Math.cos(angle) * halfStrokeWidth,
                        toy - Math.sin(angle) * halfStrokeWidth,
                        tox - headlen * Math.cos(angle + Math.PI / 6),
                        toy - headlen * Math.sin(angle + Math.PI / 6)
                    ]
                );
                moving = true;
                variables.layer.draw();
            };
            this.onMouseup = function (event) {
                if (moving) {
                    rect.height(lineLength);
                    rect.position({
                        x: -halfStrokeWidth * 4 * Math.sin(angle),
                        y: halfStrokeWidth * 4 * Math.cos(angle)
                    });

                    rect.rotate(angle * 180 / Math.PI - 90);
                }

                moving = false;
                variables.layer.draw();
            }
        };
        /**
         * 圆对象
         * @constructor
         */
        var Cycle = function () {
            var cycle, startPos, moving = false;
            var variables = $rootScope.paintCanvas;
            this.onMousedown = function (event) {
                if (moving) {
                    moving = false;
                    variables.layer.draw();
                } else {
                    if (event.target.nodeName !== 'CANVAS') {
                        return;
                    }
                    startPos = variables.stage.getPointerPosition();
                    cycle = new Kinetic.Ellipse({
                        x: startPos.x,
                        y: startPos.y,
                        radius: {
                            x: 1,
                            y: 1
                        },
                        stroke: variables.defaultColor["background-color"],
                        strokeWidth: variables.strokeWidth,
                        name: 'module',
                        tag: 'cycle'
                    });
                    variables.layer.add(cycle);
                    moving = true;
                    addModuleDragAction(cycle);
                    variables.currentAction = {
                        node: cycle,
                        type: 'module'
                    };
                    variables.haveShowModuleArr.push(variables.currentAction);
                    variables.needShowModuleArr = [];
                }
            };
            this.onMousemove = function (event) {
                if (!moving) {
                    return;
                }
                var pointerPos = variables.stage.getPointerPosition();
                if (!pointerPos) {
                    pointerPos = getOutPos(event);
                }
                var rediusX = parseInt(Math.abs(pointerPos.x - startPos.x) / 2);
                var rediusY = parseInt(Math.abs(pointerPos.y - startPos.y) / 2);
                cycle.radius({
                    x: rediusX,
                    y: rediusY
                });
                if (pointerPos.x > startPos.x && pointerPos.y < startPos.y) {
                    cycle.position({
                        x: startPos.x + parseInt(rediusX),
                        y: startPos.y - parseInt(rediusY)
                    });
                } else if (pointerPos.x < startPos.x && pointerPos.y > startPos.y) {
                    cycle.position({
                        x: startPos.x - parseInt(rediusX),
                        y: startPos.y + parseInt(rediusY)
                    });
                } else if (pointerPos.x < startPos.x && pointerPos.y < startPos.y) {
                    cycle.position({
                        x: startPos.x - parseInt(rediusX),
                        y: startPos.y - parseInt(rediusY)
                    });
                } else {
                    cycle.position({
                        x: startPos.x + parseInt(rediusX),
                        y: startPos.y + parseInt(rediusY)
                    });
                }
                variables.layer.draw();
                moving = true;
            };
            this.onMouseup = function (event) {
                moving = false;
            };
        };
        /**
         * 方形对象
         * @constructor
         */
        var Rect = function () {
            var rect, startPos, moving = false;
            var variables = $rootScope.paintCanvas;
            this.onMousedown = function (event) {
                if (moving) {
                    moving = false;
                    variables.layer.draw();
                } else {
                    if (event.target.nodeName !== 'CANVAS') {
                        return;
                    }
                    startPos = variables.stage.getPointerPosition();
                    rect = new Kinetic.Rect({
                        x: parseInt(startPos.x),
                        y: parseInt(startPos.y),
                        width: 1,
                        height: 1,
                        stroke: variables.defaultColor["background-color"],
                        strokeWidth: variables.strokeWidth,
                        name: 'module',
                        tag: 'rect'
                    });
                    variables.layer.add(rect);
                    moving = true;
                    addModuleDragAction(rect);
                    variables.currentAction = {
                        node: rect,
                        type: 'module'
                    };
                    variables.haveShowModuleArr.push(variables.currentAction);
                    variables.needShowModuleArr = [];
                }
            };
            this.onMousemove = function (event) {
                if (!moving) {
                    return;
                }
                var pointerPos = variables.stage.getPointerPosition();
                if (!pointerPos) {
                    pointerPos = getOutPos(event);
                }
                var width = parseInt(pointerPos.x - startPos.x),
                    height = parseInt(pointerPos.y - startPos.y);
                rect.width(Math.abs(width));
                rect.height(Math.abs(height));
                if (width < 0 && height < 0) {
                    rect.position({
                        x: startPos.x + width,
                        y: startPos.y + height
                    });
                } else if (width < 0 && height > 0) {
                    rect.position({
                        x: startPos.x + width,
                        y: startPos.y
                    });
                } else if (height < 0 && width > 0) {
                    rect.position({
                        x: startPos.x,
                        y: startPos.y + height
                    });
                } else {
                    rect.position({
                        x: startPos.x,
                        y: startPos.y
                    });
                }
                if (rect.width() >= 5 && rect.height() >= 5) {
                    variables.layer.draw();
                }
                moving = true;
            };
            this.onMouseup = function (event) {
                moving = false;
                if (event.target.nodeName !== 'CANVAS') {
                    return;
                }
                if (rect.width() < 5 && rect.height() < 5) {
                    rect.destroy();
                }
            };
        };
        /**
         * 文本对象
         */
        var text = function () {
            var variables = $rootScope.paintCanvas;
            this.create = function (para) {
                var text = new Kinetic.Text({
                    text: para.textVal,
                    x: parseInt(para.x) + 2,
                    y: parseInt(para.y) + 2,
                    fill: variables.defaultColor["background-color"],
                    fontSize: variables.fontSize,
                    fontFamily: variables.fontFamily,
                    name: 'module',
                    tag: 'text',
                    fontStyle: getFontWeight(variables.strokeWidth)
                });
                variables.layer.add(text);
                variables.layer.draw();
                addModuleDragAction(text);
                variables.currentAction = {
                    type: 'text',
                    node: text
                };
                variables.haveShowModuleArr.push(variables.currentAction);
            }
        };

        $rootScope.$watchCollection("[image.height, image.width, image.src]", function () {
            if ($rootScope.image.height && $rootScope.image.width) {
                var paintCanvas = $rootScope.paintCanvas;
                var stage = new Kinetic.Stage({
                    container: 'canvas',
                    width: $rootScope.image.width,
                    height: $rootScope.image.height
                });
                var layer = new Kinetic.Layer();
                var background = new Kinetic.Rect({
                    x: 0,
                    y: 0,
                    height: $rootScope.image.height,
                    width: $rootScope.image.width
                });
                //需要连同素材图片一同生成图片保存
                if ($rootScope.image.export) {
                    var layer1 = new Kinetic.Layer();
                    stage.add(layer1);
                    var img0 = new Image();
                    img0.src = $rootScope.image.src;
                    img0.crossOrigin = "*";
                    img0.onload = function () {
                        var image = new Kinetic.Image({
                            image: img0,
                            x: 0,
                            y: 0
                        });
                        layer1.add(image);
                    };
                }
                layer.add(background);
                stage.add(layer);
                paintCanvas.layer = layer;
                paintCanvas.stage = stage;
                paintCanvas.background = background;
                $rootScope.paintCanvas.modules = {
                    paint: new Paint(),
                    arrow: new Arrow(),
                    cycle: new Cycle(),
                    rect: new Rect(),
                    text: new text()
                };
            }
        });

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
                $rootScope.paintCanvas.currentAction = {
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
                var currentAction = $rootScope.paintCanvas.currentAction;
                currentAction.end = node.position();
                $rootScope.paintCanvas.haveShowModuleArr.push(currentAction);
            });

            node.on('mouseover', function () {
                if ($rootScope.paintCanvas.operationStatus === 'drag') {
                    if (this.attrs.hide) return;
                    document.getElementById('canvas').style.cursor = 'move';
                }
            });

            node.on('mouseout', function () {
                if ($rootScope.paintCanvas.operationStatus === 'drag') {
                    document.getElementById('canvas').style.cursor = 'default';
                }
            });
        }
    }]).directive("choiceColor", [function () {
        return {
            restrict: "EA",
            replace: true,
            template: '<div class="choiceColor" ng-click="showChoiceColor = !showChoiceColor;showChoiceStroke = false;">' +
            '<div ng-style="paintCanvas.defaultColor">' +
            '<div class="list" ng-show="showChoiceColor">' +
            '<i ng-repeat="style in choiceColorStyle" ng-click="choiceColorFun(style, $event)" ng-style="style">' +
            '</div>' +
            '</div>' +
            '</div>',
            controller: function ($scope) {
                document.onmousedown = function (e) {
                    if (isTargetInElement(e, angular.element('.list')) || isTargetInElement(e, angular.element('.choiceColor'))) return;
                    $scope.$apply(function () {
                        $scope.showChoiceColor = false;
                        $scope.showChoiceStroke = false;
                    })
                };
                $scope.choiceColorStyle = [
                    {"background-color": '#000000'},
                    {"background-color": '#818181'},
                    {"background-color": '#C1C1C1'},
                    {"background-color": '#FFFFFF'},
                    {"background-color": '#FB3838'},
                    {"background-color": '#F7893A'},
                    {"background-color": '#F31AF3'},
                    {"background-color": '#810000'},
                    {"background-color": '#00FF00'},
                    {"background-color": '#99CD00'},
                    {"background-color": '#FFFF00'},
                    {"background-color": '#727200'},
                    {"background-color": '#00FFFF'},
                    {"background-color": '#009999'},
                    {"background-color": '#0000FF'},
                    {"background-color": '#3895E5'}
                ];
                $scope.paintCanvas.defaultColor = $scope.choiceColorStyle[4];
                $scope.choiceColorFun = function (style, e) {
                    e.stopPropagation();
                    $scope.paintCanvas.defaultColor = style;
                    $scope.showChoiceColor = false;
                }
            }
        }
    }]).directive("choiceStroke", [function () {
        return {
            restrict: "EA",
            replace: true,
            template: '<div class="choiceStroke" ng-click="showChoiceStroke = !showChoiceStroke;showChoiceColor = false;">' +
            '<div>' +
            '<ul class="list" ng-show="showChoiceStroke">' +
            '<li ng-repeat="style in choiceStrokeStyle" ng-class="{choiced: choiceIndex==$index}"' +
            ' ng-click="choiceStrokeFun(style, $event)">' +
            '<i change-stroke-color ng-style="style"></i>' +
            '</li>' +
            '</ul>' +
            '<b change-stroke-color ng-style="defaultStyle"></b>' +
            '</div>' +
            '</div>',
            controller: function ($scope, $element) {
                $scope.choiceStrokeStyle = [
                    {height: '2px'},
                    {height: '3px'},
                    {height: '4px'},
                    {height: '5px'}
                ];
                var getDefaultStyle = function (style) {
                    var height = parseInt(style.height);
                    $scope.paintCanvas.strokeWidth = height;
                    for (var i = 0, _i = $scope.choiceStrokeStyle.length; i < _i; i++) {
                        if ($scope.choiceStrokeStyle[i].height === style.height) {
                            $scope.choiceIndex = i;
                        }
                    }
                    return {
                        height: height * 2 + 'px',
                        width: height * 2 + 'px',
                        "margin-left": -height + 'px',
                        "margin-top": -height + 'px'
                    }
                };
                $scope.defaultStyle = getDefaultStyle($scope.choiceStrokeStyle[1]);
                $scope.choiceStrokeFun = function (style, e) {
                    e.stopPropagation();
                    $scope.defaultStyle = getDefaultStyle(style);
                    $scope.showChoiceStroke = false;
                };
            }
        }
    }]).directive("changeStrokeColor", [function () {
        return {
            link: function (scope, element) {
                scope.$watch("paintCanvas.defaultColor", function () {
                    if (scope.paintCanvas.defaultColor) {
                        element.css('background-color', scope.paintCanvas.defaultColor["background-color"]);
                    }
                })
            }
        }
    }]).directive("paintHeader", [function () {
        return {
            restrict: "EA",
            replace: true,
            template: '<div class="header">' +
            '<div choice-stroke></div>' +
            '<div choice-color></div>' +
            '<a><i></i></a>' +
            '<a ng-click="switchingMode(\'painting\')" ng-class="{active: paintCanvas.operationStatus === \'painting\'}">' +
            '<i class="tool_icon tool_pencil" title="绘画"></i>' +
            '<a ng-click="switchingMode(\'text\')" ng-class="{active: paintCanvas.operationStatus === \'text\'}">' +
            '<i class="tool_icon tool_text" title="文字"></i>' +
            '</a>' +
            '<a ng-click="switchingMode(\'arrow\')" ng-class="{active: paintCanvas.operationStatus === \'arrow\'}">' +
            '<i class="tool_icon tool_line" title="箭头"></i>' +
            '</a>' +
            '<a ng-click="switchingMode(\'cycle\')" ng-class="{active: paintCanvas.operationStatus === \'cycle\'}">' +
            '<i class="tool_icon tool_circle" title="画圆"></i>' +
            '</a>' +
            '<a ng-click="switchingMode(\'rect\')" ng-class="{active: paintCanvas.operationStatus === \'rect\'}">' +
            '<i class="tool_icon tool_square" title="矩形"></i>' +
            '</a>' +
            '<a><i></i></a>' +
            '<a ng-click="switchingMode(\'drag\')" ng-class="{active: paintCanvas.operationStatus === \'drag\'}">' +
            '<i class="tool_icon tool_move" title="拖动"></i>' +
            '</a>' +
            '<button ng-click="lastStep()"><i class="tool_icon tool_undo" title="上一步"></i></button>' +
            '<button ng-click="nextStep()"><i class="tool_icon tool_redo" title="下一步"></i></button>' +
            '<a><i></i></a>' +
            '<a ng-click="clearAll()"><i class="tool_icon tool_delete" title="清除所有"></i></a>' +
            '</a>' +
            '<div class="save">' +
            //'<input type="button" ng-click="cancel()" class="btn btn-cancel" value="取消"/>' +
            '<input type="button" ng-click="save()" class="btn btn-ok" value="保存">' +
            '</div>' +
            '</div>',
            controller: function ($scope, $element) {
                var variable = $scope.paintCanvas;
                $scope.switchingMode = function (mode) {
                    variable.operationStatus = mode;
                    if (mode === 'drag') {
                        variable.stage.get('.module').draggable(true);
                    } else {
                        variable.stage.get('.module').draggable(false);
                    }
                    if (mode === 'text') {
                        document.getElementById("canvas").style.cursor = 'text';
                    } else {
                        document.getElementById("canvas").style.cursor = 'crosshair';
                    }
                };
                //undo
                $scope.lastStep = function () {
                    var thisModule = variable.haveShowModuleArr.pop();
                    if (thisModule) {
                        variable.needShowModuleArr.push(thisModule);
                        if (thisModule.type === 'module' || thisModule.type === 'text') {
                            thisModule.node.hide();
                            thisModule.node.attrs.hide = true;
                        } else if (thisModule.type === 'drag') {
                            thisModule.node.position(thisModule.start);
                        }
                        variable.layer.draw();
                    } else {
                        console.log('已经到第一步了');
                    }
                };
                //redo
                $scope.nextStep = function () {
                    var thisModule = variable.needShowModuleArr.pop();
                    if (thisModule) {
                        variable.haveShowModuleArr.push(thisModule);
                        if (thisModule.type === 'module' || thisModule.type === 'text') {
                            thisModule.node.show();
                            thisModule.node.attrs.hide = false;
                        } else if (thisModule.type === 'drag') {
                            thisModule.node.position(thisModule.end);
                        }
                        variable.layer.draw();
                    } else {
                        console.log('已经到最后一步了');
                    }
                };
                //delete
                $scope.clearAll = function () {
                    variable.stage.get('.module').destroy();
                    variable.layer.draw();
                    variable.haveShowModuleArr = [];
                    variable.needShowModuleArr = [];
                };
                //save
                $scope.save = function () {
                    $scope.paintCanvas.stage.toDataURL({
                        callback: function (dataUrl) {
                            $scope.$apply(function () {
                                $scope.cfpAngularReviewProvider.config.paintSrc = dataUrl;
                                $scope.showPaint = false;
                                $scope.haveAddPaint = true;
                            });
                        }
                    });
                };
                //cancel
                $scope.cancel = function () {
                    $scope.showPaint = false;
                    $scope.image.src = undefined;
                }
            }
        }
    }]).directive("paintContent", [function () {
        return {
            restrict: "EA",
            replace: true,
            template: '<div class="content" id="review-paint-content" init-content-size>' +
            '<img canvas-init ng-src="{{image.src}}" test="{{image}}" alt="示例图片"/>' +
            '<textarea wrap="physical" id="inputText" type="text" ng-blur="inputBlur()" ng-show="inputTextStyle.show" focus-on ' +
            'ng-style="inputTextStyle" id="inputText"></textarea>' +
            '<div id="canvas" ng-click="addText($event)"></div>' +
            '</div>',
            controller: function ($scope) {
                $scope.inputTextStyle = {};
                var addEvent = function (event, eventName) {
                    var canvasNode = document.getElementById("canvas") &&
                        document.getElementById("canvas").getElementsByTagName("canvas")[0];
                    if (!canvasNode) return;
                    var operationStatus = $scope.paintCanvas.operationStatus;
                    var modules = $scope.paintCanvas.modules;
                    if (operationStatus === 'painting') {
                        modules.paint[eventName](event);
                    } else if (operationStatus === 'arrow') {
                        modules.arrow[eventName](event)
                    } else if (operationStatus === 'cycle') {
                        modules.cycle[eventName](event);
                    } else if (operationStatus === 'rect') {
                        modules.rect[eventName](event);
                    }
                };
                var node = document.getElementsByTagName("body")[0];
                node.onmousedown = function (event) {
                    addEvent(event, "onMousedown");
                };
                node.onmousemove = function (event) {
                    addEvent(event, "onMousemove");
                };
                node.onmouseup = function (event) {
                    addEvent(event, "onMouseup");
                };
                //添加文本操作
                $scope.addText = function (event) {
                    var operationStatus = $scope.paintCanvas.operationStatus;
                    var node = event.target || event.srcElement;
                    if (operationStatus !== 'text' || node.nodeName !== 'CANVAS') {
                        return;
                    }
                    $scope.inputBlur();
                    var canvas = document.getElementById('review-paint-content'),
                        offsetLeft = angular.element(canvas).offset().left || canvas.offsetLeft,
                        offsetTop = angular.element(canvas).offset().top || canvas.offsetTop,
                        canvasWidth = canvas.getElementsByClassName("kineticjs-content")[0].offsetWidth,
                        canvasHeight = canvas.getElementsByClassName("kineticjs-content")[0].offsetHeight,
                        canvasContent = canvas.getElementsByClassName("kineticjs-content")[0],
                        canvasLeft = angular.element(canvasContent).offset().left || canvasContent.offsetLeft,
                        canvasTop = angular.element(canvasContent).offset().top || canvasContent.offsetTop,
                        scrollHeight = canvas.scrollTop,
                        scrollWidth = canvas.scrollLeft,
                        x = event.pageX - offsetLeft,
                        y = event.pageY - offsetTop;

                    $scope.inputTextStyle = {
                        top: y - 10 + scrollHeight + 'px',
                        left: x + 2 + scrollWidth + 'px',
                        width: canvasWidth - event.pageX + canvasLeft + 'px',
                        height: canvasHeight - event.pageY + canvasTop + 'px',
                        show: true,
                        focus: true,
                        color: $scope.paintCanvas.defaultColor['background-color'],
                        "font-weight": getFontWeight($scope.paintCanvas.strokeWidth),
                        "font-family": $scope.paintCanvas.fontFamily,
                        "font-size": $scope.paintCanvas.fontSize
                    };
                };
                $scope.inputBlur = function () {
                    addLineBreaks('inputText');
                    var paintContent = document.getElementById("review-paint-content"),
                        canvasContent = paintContent.getElementsByClassName("kineticjs-content")[0],
                        _this = document.getElementById("inputText"),
                        canvasLeft = canvasContent.offsetLeft,
                        canvasTop = canvasContent.offsetTop,
                        _thisLeft = _this.offsetLeft,
                        _thisTop = _this.offsetTop,
                        x = _thisLeft - canvasLeft,
                        y = _thisTop - canvasTop,
                        scrollHeight = canvas.scrollTop,
                        scrollWidth = canvas.scrollLeft;

                    var variable = $scope.paintCanvas;
                    var textVal = _this.value;
                    var para = {
                        textVal: textVal,
                        x: x + scrollWidth,
                        y: y + scrollHeight
                    };
                    if (para.textVal !== "") {
                        variable.modules.text.create(para);
                    }
                    _this.value = '';
                    $scope.inputTextStyle.show = false;
                    $scope.inputTextStyle.focus = false;
                }
            }
        }
    }]).directive("paint", ["$rootScope", "$timeout", function ($rootScope, $timeout) {
        return {
            restrict: "EA",
            replace: true,
            template: "<div id='review-paint'>" +
            "<div paint-header></div>" +
            "<div paint-content></div>" +
            "</div>",
            scope: "@",
            link: function (scope, element, attrs) {
                //设置需要连同素材图片一同生成图片保存
                // 设置元素exportimg属性即可一同保存(但有相应限制)，
                // 不设置只保存绘画图片
                if (attrs.exportimg !== undefined) {
                    $rootScope.image.export = true;
                }
                if(attrs.imgSrc) {
                    $rootScope.image.src = attrs.imgSrc;
                }
            }
        }
    }]).directive("canvasInit", ["$rootScope", function ($rootScope) {
        return {
            link: function (scope, element) {
                element[0].onload = function () {
                    var that = this;
                    $rootScope.$apply(function () {
                        $rootScope.image.height = that.height;
                        $rootScope.image.width = that.width;
                    });
                }
            }
        }
    }]).directive("focusOn", [function () {
        return {
            link: function (scope, element) {
                scope.$watch("inputTextStyle.focus", function () {
                    if (scope.inputTextStyle) {
                        if (scope.inputTextStyle.focus) {
                            element[0].focus();
                        }
                    }
                })
            }
        }
    }]).directive("initContentSize", ["$timeout", function ($timeout) {
        return {
            link: function (scope, element) {
                //对容器进行初始化，即 #review-panit > .content
                scope.$watchCollection("[image.height, image.src]", function () {
                    if (scope.image.height) {
                        var setContentSize = function () {
                            var windowHeight = window.innerHeight,
                                windowWidth = window.innerWidth;
                            element.css({
                                "max-height": windowHeight - 88 + 'px',
                                "max-width": windowWidth - 40 + 'px'
                            });
                            if (windowHeight - 88 < scope.image.height || windowWidth - 40 < scope.image.width) {
                                element.css({"overflow": "auto"});
                            } else {
                                element.css({"overflow": "inherit"});
                            }
                            if (isUneven(scope.image.height)) {
                                element.find('img').css("margin-top", '1px');
                            }
                            if (isUneven(scope.image.width)) {
                                element.find('img').css("margin-left", '1px');
                            }
                        };
                        setContentSize();
                        window.onresize = setContentSize;
                    }
                });
                //进行进入附件时，大图时，根据位置进行定位
                scope.$watch("showPaint", function () {
                    if (scope.showPaint && scope.reviewVariables && scope.reviewVariables.currentPinPosition
                        && scope.reviewVariables.canvas.ratio) {
                        var pinPos = scope.reviewVariables.currentPinPosition;
                        var ratio = scope.reviewVariables.canvas.ratio;
                        var rightPosition = {
                            x: pinPos.x / ratio,
                            y: pinPos.y / ratio
                        };
                        var maxHeight = parseInt(element.css("max-height"));
                        var maxWidth = parseInt(element.css("max-width"));
                        var imageH = element.find("img")[0].height;
                        var imageW = element.find("img")[0].width;
                        if (imageH > maxHeight) {
                            var scrollTop = rightPosition.y - maxHeight / 2;
                            var promiseH = $timeout(function () {
                                element.scrollTop(scrollTop);
                                $timeout.cancel(promiseH);
                            }, 50);
                        }
                        if (imageW > maxWidth) {
                            var scrollLeft = rightPosition.x - maxWidth / 2;
                            var promiseW = $timeout(function () {
                                element.scrollLeft(scrollLeft);
                                $timeout.cancel(promiseW);
                            }, 50);
                        }
                    }
                })
            }
        }
    }]);
    /**
     * 获取字体样式
     * @param strokeWidth
     * @returns {*}
     */
    function getFontWeight(strokeWidth) {
        var fontWeight;
        switch (strokeWidth) {
            case 3:
                fontWeight = 400;
                break;
            case 4:
                fontWeight = 600;
                break;
            case 5:
                fontWeight = 900;
                break;
            default:
                fontWeight = 100;
        }
        return fontWeight;
    }

    /**
     * 获取鼠标处于canvas外时，此时绘画位置
     * @param posObj
     */
    function getOutPos(event) {
        var posObj = {},
            canvas = document.getElementById("canvas"),
            node = canvas.getElementsByTagName("canvas")[0],
            canvasContent = document.getElementById("review-paint-content"),
            scrollLeft = canvasContent.scrollLeft,
            scrollTop = canvasContent.scrollTop,
            left = angular.element(node).offset().left + scrollLeft,
            top = angular.element(node).offset().top + scrollTop,
            width = Math.min(angular.element(node).width(), angular.element(canvas).width()),
            height = Math.min(angular.element(node).height(), angular.element(canvas).height());
        //获取x位置
        if (event.pageX >= left + width) {
            posObj.x = width;
        }
        else if (event.pageX > left && event.pageX < left + width) {
            posObj.x = event.pageX - left;
        }
        else if (event.pageX <= left) {
            posObj.x = 0;
        }
        //获取y位置
        if (event.pageY >= top && event.pageY <= top + height) {
            posObj.y = event.pageY - top;
        } else if (event.pageY < top) {
            posObj.y = 0;
        } else {
            posObj.y = height;
        }
        posObj.y += scrollTop;
        posObj.x += scrollLeft;
        return posObj;
    }

    var isTargetInElement = function (event, element) {
        if (event === undefined || element.get(0) === undefined) return;
        var e = event || window.event;
        var currentNode = e.target || e.srcElement;
        if (currentNode == element.get(0)) return true;
        var elementChildNodeArr = element.get(0).getElementsByTagName('*');
        for (var i = 0, _i = elementChildNodeArr.length; i < _i; i++) {
            if (elementChildNodeArr[i] == currentNode) {
                return true;
            }
        }
        return false;
    };

    var isUneven = function(number) {
        return number % 2 === 1;
    };

    var addLineBreaks = function(strTextAreaId) {
        var oTextarea = document.getElementById(strTextAreaId);
        if (oTextarea.wrap) {
            oTextarea.setAttribute("wrap", "off");
        }
        else {
            oTextarea.setAttribute("wrap", "off");
            var newArea = oTextarea.cloneNode(true);
            newArea.value = oTextarea.value;
            oTextarea.parentNode.replaceChild(newArea, oTextarea);
            oTextarea = newArea;
        }

        var strRawValue = oTextarea.value;
        oTextarea.value = "";
        var nEmptyWidth = oTextarea.scrollWidth;
        var nLastWrappingIndex = -1;
        for (var i = 0; i < strRawValue.length; i++) {
            var curChar = strRawValue.charAt(i);
            if (curChar == ' ' || curChar == '-' || curChar == '+')
                nLastWrappingIndex = i;
            oTextarea.value += curChar;
            if (oTextarea.scrollWidth > nEmptyWidth) {
                var buffer = "";
                if (nLastWrappingIndex >= 0) {
                    for (var j = nLastWrappingIndex + 1; j < i; j++)
                        buffer += strRawValue.charAt(j);
                    nLastWrappingIndex = -1;
                }
                buffer += curChar;
                oTextarea.value = oTextarea.value.substr(0, oTextarea.value.length - buffer.length);
                oTextarea.value += "\n" + buffer;
            }
        }
        oTextarea.setAttribute("wrap", "hard");
        return oTextarea.value.replace(new RegExp("\\n", "g"), "\n");
    };

})();