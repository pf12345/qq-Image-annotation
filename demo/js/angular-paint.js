(function () {
    'use strict';
    angular.module('angular-paint', ['angularPaint']);

    angular.module('angularPaint', []).run(function ($rootScope) {
        $rootScope.image = {};
        $rootScope.paintCanvas = {
            strokeWidth: 3, //边框宽度
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
                isMouseDown = true;
                points = [];
                var pointerPos = variables.stage.getPointerPosition();
                points.push(pointerPos.x);
                points.push(pointerPos.y);
                var line = new Kinetic.Line({
                    points: points,
                    stroke: variables.defaultColor["background-color"],
                    strokeWidth: variables.strokeWidth,
                    lineCap: 'round',
                    lineJoin: 'round',
                    name: 'module'
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
            var group, line, moving = false;
            var variables = $rootScope.paintCanvas;
            this.onMousedown = function (event) {
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
                        draggable: true
                    });
                    line = new Kinetic.Line({
                        points: [0, 0, 0, 0], //start point and end point are the same
                        stroke: variables.defaultColor["background-color"],
                        strokeWidth: variables.strokeWidth,
                        name: 'module'
                    });
                    group.add(line);
                    variables.layer.add(group);
                    moving = true;
                    addModuleDragAction(line);
                    variables.currentAction = {
                        node: line,
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
                variables.layer.draw();
            };
            this.onMouseup = function (event) {
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
                    cycle = new Kinetic.Circle({
                        x: startPos.x,
                        y: startPos.y,
                        radius: 1,
                        stroke: variables.defaultColor["background-color"],
                        strokeWidth: variables.strokeWidth,
                        name: 'module'
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
                    variables.layer.draw();
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
                        x: startPos.x,
                        y: startPos.y,
                        width: 1,
                        height: 1,
                        stroke: variables.defaultColor["background-color"],
                        cornerRadius: 5,
                        strokeWidth: variables.strokeWidth,
                        name: 'module'
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
                    variables.layer.draw();
                }
                moving = true;
            };
            this.onMouseup = function (event) {
                if (event.target.nodeName !== 'CANVAS') {
                    return;
                }
                moving = false;
                if (rect.width() < 5 && rect.height() < 5) {
                    rect.destroy();
                }
            };
        };
        var text = function () {
            var variables = $rootScope.paintCanvas;
            this.create = function (para) {
                var text = new Kinetic.Text({
                    text: para.textVal,
                    x: para.x,
                    y: para.y + 2,
                    fill: variables.defaultColor["background-color"],
                    fontSize: 16,
                    align: "center",
                    name: 'module',
                    fontStyle: 'bold'
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


        $rootScope.$watch("image.height", function () {
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
                var layer1 = new Kinetic.Layer();
                stage.add(layer1);
                if($rootScope.image.export) {
                    var img0 = new Image();
                    img0.src = $rootScope.image.src;
                    img0.crossOrigin="*";
                    img0.onload = function() {
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
        }
    }).directive("choiceColor", [function () {
        return {
            restrict: "EA",
            replace: true,
            template: '<div class="choiceColor" ng-click="showChoiceColor = !showChoiceColor">' +
            '<div ng-style="paintCanvas.defaultColor">' +
            '<div class="list" ng-show="showChoiceColor">' +
            '<i ng-repeat="style in choiceColorStyle" ng-click="choiceColorFun(style, $event)" ng-style="style">' +
            '</div>' +
            '</div>' +
            '</div>',
            controller: function ($scope) {
                $scope.choiceColorStyle = [
                    {"background-color": '#ff0000'},
                    {"background-color": '#fd9720'},
                    {"background-color": '#ff10fc'},
                    {"background-color": '#0ec26f'},
                    {"background-color": '#fc9d9a'},
                    {"background-color": '#f9cdad'},
                    {"background-color": '#69e250'},
                    {"background-color": '#daec13'},
                    {"background-color": '#4270f6'},
                    {"background-color": '#09c2ff'},
                    {"background-color": '#39f9fb'},
                    {"background-color": '#ffcf0f'}
                ];
                $scope.paintCanvas.defaultColor = $scope.choiceColorStyle[0];
                $scope.choiceColorFun = function(style, e) {
                    e.stopPropagation();
                    $scope.paintCanvas.defaultColor = style;
                    $scope.showChoiceColor = false;
                }
            }
        }
    }]).directive("paintHeader", [function () {
        return {
            restrict: "EA",
            replace: true,
            template: '<div class="header">' +
            '<div choice-color></div>' +
            '<a ng-click="switchingMode(\'painting\')" ng-class="{active: paintCanvas.operationStatus === \'painting\'}">' +
            '<i class="tool_icon tool_pencil" title="绘画"></i>' +
            '</a>' +
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
            '<a ng-click="switchingMode(\'drag\')" ng-class="{active: paintCanvas.operationStatus === \'drag\'}">' +
            '<i class="tool_icon tool_move" title="拖动"></i>' +
            '</a>' +
            '<a ng-click="lastStep()"><i class="tool_icon tool_undo" title="上一步"></i></a>' +
            '<a ng-click="nextStep()"><i class="tool_icon tool_redo" title="下一步"></i></a>' +
            '<a ng-click="clearAll()"><i class="tool_icon tool_delete" title="清除所有"></i></a>' +
            '<div class="save">' +
            '<input type="button" ng-click="cancel()" class="btn btn-cancel" value="取消"/>' +
            '<input type="button" ng-click="save()" class="btn btn-save" value="保存">' +
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
                };
                $scope.lastStep = function () {
                    var thisModule = variable.haveShowModuleArr.pop();
                    if (thisModule) {
                        variable.needShowModuleArr.push(thisModule);
                        if (thisModule.type === 'module' || thisModule.type === 'text') {
                            thisModule.node.hide();
                        } else if (thisModule.type === 'drag') {
                            thisModule.node.position(thisModule.start);
                        }
                        variable.layer.draw();
                    } else {
                        console.log('已经到第一步了');
                    }
                };
                $scope.nextStep = function () {
                    var thisModule = variable.needShowModuleArr.pop();
                    if (thisModule) {
                        variable.haveShowModuleArr.push(thisModule);
                        if (thisModule.type === 'module' || thisModule.type === 'text') {
                            thisModule.node.show();
                        } else if (thisModule.type === 'drag') {
                            thisModule.node.position(thisModule.end);
                        }
                        variable.layer.draw();
                    } else {
                        console.log('已经到最后一步了');
                    }
                };
                $scope.clearAll = function () {
                    variable.stage.get('.module').destroy();
                    variable.layer.draw();
                    variable.haveShowModuleArr = [];
                    variable.needShowModuleArr = [];
                };
                $scope.save = function () {
                    $scope.paintCanvas.stage.toDataURL({
                        callback: function (dataUrl) {
                            window.open(dataUrl)
                        }
                    });
                }
            }
        }
    }]).directive("paintContent", [function () {
        return {
            restrict: "EA",
            replace: true,
            template: '<div class="content" id="review-paint-content" init-content-size>' +
            '<img canvas-init ng-src="{{image.src}}" alt="示例图片"/>' +
            '<input id="inputText" type="text" ng-blur="inputBlur()" ng-show="inputTextStyle.show" focus-on ' +
            'ng-style="inputTextStyle" id="inputText"/>' +
            '<div id="canvas" ng-mousedown="onMouseDown($event)" ng-mousemove="onMouseMove($event)" ' +
            'ng-mouseup="onMouseUp($event)" ng-click="addText($event)"></div>' +
            '</div>',
            controller: function ($scope) {
                $scope.inputTextStyle = {};
                var addEvent = function (event, eventName) {
                    var node = event.target || event.srcElement;
                    if (node.nodeName !== 'CANVAS') {
                        return;
                    }
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
                $scope.onMouseDown = function (event) {
                    addEvent(event, "onMousedown");
                };
                $scope.onMouseMove = function (event) {
                    addEvent(event, "onMousemove");
                };
                $scope.onMouseUp = function (event) {
                    addEvent(event, "onMouseup");
                };
                $scope.addText = function (event) {
                    var operationStatus = $scope.paintCanvas.operationStatus;
                    var node = event.target || event.srcElement;
                    if (operationStatus !== 'text' || node.nodeName !== 'CANVAS') {
                        return;
                    }
                    if (!$scope.inputTextStyle.show) {
                        var canvas = document.getElementById('review-paint-content'),
                            offsetLeft = canvas.offsetLeft,
                            offsetTop = canvas.offsetTop;

                        var x = event.pageX - offsetLeft,
                            y = event.pageY - offsetTop;
                        $scope.inputTextStyle = {
                            top: y + 'px',
                            left: x + 'px',
                            show: true,
                            focus: true,
                            color: $scope.paintCanvas.defaultColor['background-color']
                        };
                    } else {
                        $scope.inputTextStyle.show = false;
                        $scope.inputBlur();
                    }
                };
                $scope.inputBlur = function () {
                    var paintContent = document.getElementById("review-paint-content"),
                        canvasContent = paintContent.getElementsByClassName("kineticjs-content")[0],
                        _this = document.getElementById("inputText"),
                        canvasLeft = canvasContent.offsetLeft,
                        canvasTop = canvasContent.offsetTop,
                        _thisLeft = _this.offsetLeft,
                        _thisTop = _this.offsetTop,
                        x = _thisLeft - canvasLeft,
                        y = _thisTop - canvasTop;
                    var variable = $scope.paintCanvas;
                    var textVal = _this.value;
                    var para = {
                        textVal: textVal,
                        x: x,
                        y: y
                    };
                    variable.modules.text.create(para);
                    _this.value = '';
                    $scope.inputTextStyle.show = false;
                    $scope.inputTextStyle.focus = false;
                }
            }
        }
    }]).directive("paint", ["$rootScope", function ($rootScope) {
        return {
            restrict: "EA",
            replace: true,
            template: "<div id='review-paint'>" +
            "<div paint-header></div>" +
            "<div paint-content></div>" +
            "</div>",
            scope: "@",
            link: function (scope, element, attrs) {
                $rootScope.image.src = attrs.imgSrc;
                if(attrs.exportimg !== undefined) {
                    $rootScope.image.export = true;
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
    }]).directive("initContentSize", [function () {
        return {
            link: function (scope, element) {
                var setContentSize = function () {
                    var windowHeight = window.innerHeight,
                        windowWidth = window.innerWidth;
                    element.css({
                        "max-height": windowHeight - 140 + 'px',
                        "max-width": windowWidth - 80 + 'px',
                        "overflow": "auto"
                    });
                };
                setContentSize();
                window.onresize = setContentSize;
            }
        }
    }]);
})();