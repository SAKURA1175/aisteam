import { useRef, useState, useEffect } from 'react';
import Matter from 'matter-js';
import './FallingText.css';

export interface FallingTextProps {
  className?: string;
  text?: string;
  highlightWords?: string[];
  highlightClass?: string;
  trigger?: 'auto' | 'scroll' | 'click' | 'hover';
  backgroundColor?: string;
  wireframes?: boolean;
  gravity?: number;
  mouseConstraintStiffness?: number;
  fontSize?: string;
}

const FallingText = ({
  className = '',
  text = '',
  highlightWords = [],
  highlightClass = 'highlighted',
  trigger = 'auto',
  backgroundColor = 'transparent',
  wireframes = false,
  gravity = 1,
  mouseConstraintStiffness = 0.2,
  fontSize = '1rem'
}: FallingTextProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const [effectStarted, setEffectStarted] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('fallingTextTriggered') === 'true') {
      setEffectStarted(true);
    }
  }, []);

  useEffect(() => {
    if (effectStarted && textRef.current) {
      textRef.current.style.cursor = 'default';
      textRef.current.style.pointerEvents = 'none';
    }
  }, [effectStarted]);

  useEffect(() => {
    if (!textRef.current) return;
    const words = text.split(' ');
    const newHTML = words
      .map(word => {
        // 去除标点符号进行匹配
        const cleanWord = word.replace(/[.,!?;:]/g, '');
        let wordClass = '';

        // 判断是否是"童趣"（活泼色系）
        if (cleanWord.includes('童趣')) {
          wordClass = 'highlighted';
        } 
        // 判断是否是"陪伴"（暖色系）
        else if (cleanWord.includes('陪伴')) {
          wordClass = 'highlighted-warm';
        }

        return `<span class="word ${wordClass}">${word}</span>`;
      })
      .join(' ');
    textRef.current.innerHTML = newHTML;
  }, [text, highlightWords, highlightClass]);

  useEffect(() => {
    if (trigger === 'auto') {
      setEffectStarted(true);
      return;
    }
    if (trigger === 'scroll' && containerRef.current) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setEffectStarted(true);
            observer.disconnect();
          }
        },
        { threshold: 0.1 }
      );
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }
  }, [trigger]);

  useEffect(() => {
    if (!effectStarted) return;

    const { Engine, Render, World, Bodies, Runner } = Matter;

    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    const width = containerRect.width;
    const height = containerRect.height;

    if (width <= 0 || height <= 0) {
      return;
    }

    const engine = Engine.create();
    engine.world.gravity.y = gravity;

    const render = Render.create({
      element: canvasContainerRef.current as HTMLElement,
      engine,
      options: {
        width,
        height,
        background: backgroundColor,
        wireframes
      }
    });

    const isAlreadyTriggered = typeof window !== 'undefined' && sessionStorage.getItem('fallingTextTriggered') === 'true';

    const boundaryOptions = {
      isStatic: true,
      render: { fillStyle: 'transparent' }
    };
    
    // 我们将把碎裂的字体限制在 container 的视野内，堆积在底部
    // 为了防止掉出屏幕外，底墙高度设定为 height，厚度设定为 50，居中在 height + 25 的位置
    const floor = Bodies.rectangle(width / 2, height + 25, width + 100, 50, boundaryOptions);
    const leftWall = Bodies.rectangle(-25, height / 2, 50, height * 2, boundaryOptions);
    const rightWall = Bodies.rectangle(width + 25, height / 2, 50, height * 2, boundaryOptions);
    const ceiling = Bodies.rectangle(width / 2, -25, width, 50, boundaryOptions);

    const wordSpans = textRef.current?.querySelectorAll('.word');
    if (!wordSpans) return;

    const wordBodies = [...wordSpans].map(elem => {
      const rect = elem.getBoundingClientRect();

      // 这里必须使用相对于 container 的绝对坐标，否则绝对定位后会飞到不知哪里去
      const x = rect.left - containerRect.left + rect.width / 2;
      // 如果已经触发过，让字体直接生成在接近底部的 y 坐标
      const y = isAlreadyTriggered ? height - 50 - Math.random() * 50 : rect.top - containerRect.top + rect.height / 2;

      const body = Bodies.rectangle(x, y, rect.width, rect.height, {
        render: { fillStyle: 'transparent' },
        restitution: 0.1, // 减小弹力
        frictionAir: 0.01,
        friction: 0.5,
        density: 2
      });

      if (!isAlreadyTriggered) {
        Matter.Body.setVelocity(body, {
          x: (Math.random() - 0.5) * 8,
          y: -Math.random() * 5 - 2 // 向上抛
        });
        Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.2);
      }
      
      // 改变元素的定位方式，使其脱离原本的 flex 布局，受物理引擎的 translate 控制
      const htmlElem = elem as HTMLElement;
      htmlElem.style.position = 'absolute';
      htmlElem.style.margin = '0'; // 消除原本的 margin 干扰
      // 将元素原点设定在左上角 (0,0)
      htmlElem.style.left = `0px`;
      htmlElem.style.top = `0px`;
      
      return { elem: htmlElem, body };
    });

    World.add(engine.world, [floor, leftWall, rightWall, ceiling, ...wordBodies.map(wb => wb.body)]);

    const runner = Runner.create();
    Runner.run(runner, engine);
    Render.run(render);

    let animationFrameId: number;
    const updateLoop = () => {
      wordBodies.forEach(({ body, elem }) => {
        const { x, y } = body.position;
        // 使用 transform 来更新物理位置，因为元素的左上角被固定在 0,0
        // translate 的位置需要减去元素本身一半的宽高，使元素的中心与刚体的中心对齐
        elem.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${body.angle}rad)`;
      });
      Matter.Engine.update(engine);
      animationFrameId = requestAnimationFrame(updateLoop);
    };
    updateLoop();

    return () => {
      cancelAnimationFrame(animationFrameId);
      Render.stop(render);
      Runner.stop(runner);
      if (render.canvas && canvasContainerRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        canvasContainerRef.current.removeChild(render.canvas);
      }
      World.clear(engine.world, false);
      Engine.clear(engine);
    };
  }, [effectStarted, gravity, wireframes, backgroundColor, mouseConstraintStiffness]);

  const handleTrigger = () => {
    if (!effectStarted && (trigger === 'click' || trigger === 'hover')) {
      setEffectStarted(true);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('fallingTextTriggered', 'true');
      }
      // 注意：不要隐藏 textRef，因为掉落的单词元素正是其子节点。
      if (textRef.current) {
        textRef.current.style.cursor = 'default';
        textRef.current.style.pointerEvents = 'none';
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={`falling-text-container ${className}`}
      onClick={trigger === 'click' ? handleTrigger : undefined}
      onMouseEnter={trigger === 'hover' ? handleTrigger : undefined}
      style={{
        position: 'absolute', 
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        pointerEvents: 'none' // 强制容器不拦截鼠标，解决滚轮被锁死的问题
      }}
    >
      <div
        ref={textRef}
        className="falling-text-target"
        style={{
          fontSize: fontSize,
          lineHeight: 1.4,
          pointerEvents: effectStarted ? 'none' : 'auto', // 动画前允许点击文字
          cursor: effectStarted ? 'default' : 'pointer'
        }}
      />
      <div 
        ref={canvasContainerRef} 
        className="falling-text-canvas" 
        style={{ pointerEvents: 'none' }} // 不再拦截鼠标事件
      />
    </div>
  );
};

export default FallingText;
