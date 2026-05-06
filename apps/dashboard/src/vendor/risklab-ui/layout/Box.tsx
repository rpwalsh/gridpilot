import {
  type CSSProperties,
  type ElementType,
  type ReactNode,
  type Ref,
  type ComponentPropsWithRef,
  forwardRef,
} from 'react';

type SpacingValue = string | number;

interface BoxOwnProps {
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  xstyle?: Record<string, unknown>;
  children?: ReactNode;
  testId?: string;

  // Padding
  p?: SpacingValue;
  px?: SpacingValue;
  py?: SpacingValue;
  pt?: SpacingValue;
  pb?: SpacingValue;
  pl?: SpacingValue;
  pr?: SpacingValue;

  // Margin
  m?: SpacingValue;
  mx?: SpacingValue;
  my?: SpacingValue;
  mt?: SpacingValue;
  mb?: SpacingValue;
  ml?: SpacingValue;
  mr?: SpacingValue;

  // Layout
  display?: CSSProperties['display'];
  position?: CSSProperties['position'];
  overflow?: CSSProperties['overflow'];
  width?: SpacingValue;
  height?: SpacingValue;
  minWidth?: SpacingValue;
  minHeight?: SpacingValue;
  maxWidth?: SpacingValue;
  maxHeight?: SpacingValue;

  // Visual
  bg?: string;
  color?: string;
  radius?: SpacingValue;
  shadow?: string;
  border?: string;

  // Flex child
  flex?: CSSProperties['flex'];
  grow?: CSSProperties['flexGrow'];
  shrink?: CSSProperties['flexShrink'];
  basis?: CSSProperties['flexBasis'];
  alignSelf?: CSSProperties['alignSelf'];
  order?: CSSProperties['order'];
}

type BoxProps<E extends ElementType = 'div'> = BoxOwnProps &
  Omit<ComponentPropsWithRef<E>, keyof BoxOwnProps>;

function resolveSpacing(value: SpacingValue | undefined): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === 'number' ? `${value}px` : value;
}

function buildStyles(props: BoxOwnProps): CSSProperties {
  const s: Record<string, unknown> = {};

  // Padding
  if (props.p !== undefined) s['padding'] = resolveSpacing(props.p);
  if (props.px !== undefined) {
    s['paddingLeft'] = resolveSpacing(props.px);
    s['paddingRight'] = resolveSpacing(props.px);
  }
  if (props.py !== undefined) {
    s['paddingTop'] = resolveSpacing(props.py);
    s['paddingBottom'] = resolveSpacing(props.py);
  }
  if (props.pt !== undefined) s['paddingTop'] = resolveSpacing(props.pt);
  if (props.pb !== undefined) s['paddingBottom'] = resolveSpacing(props.pb);
  if (props.pl !== undefined) s['paddingLeft'] = resolveSpacing(props.pl);
  if (props.pr !== undefined) s['paddingRight'] = resolveSpacing(props.pr);

  // Margin
  if (props.m !== undefined) s['margin'] = resolveSpacing(props.m);
  if (props.mx !== undefined) {
    s['marginLeft'] = resolveSpacing(props.mx);
    s['marginRight'] = resolveSpacing(props.mx);
  }
  if (props.my !== undefined) {
    s['marginTop'] = resolveSpacing(props.my);
    s['marginBottom'] = resolveSpacing(props.my);
  }
  if (props.mt !== undefined) s['marginTop'] = resolveSpacing(props.mt);
  if (props.mb !== undefined) s['marginBottom'] = resolveSpacing(props.mb);
  if (props.ml !== undefined) s['marginLeft'] = resolveSpacing(props.ml);
  if (props.mr !== undefined) s['marginRight'] = resolveSpacing(props.mr);

  // Layout
  if (props.display !== undefined) s['display'] = props.display;
  if (props.position !== undefined) s['position'] = props.position;
  if (props.overflow !== undefined) s['overflow'] = props.overflow;
  if (props.width !== undefined) s['width'] = resolveSpacing(props.width);
  if (props.height !== undefined) s['height'] = resolveSpacing(props.height);
  if (props.minWidth !== undefined) s['minWidth'] = resolveSpacing(props.minWidth);
  if (props.minHeight !== undefined) s['minHeight'] = resolveSpacing(props.minHeight);
  if (props.maxWidth !== undefined) s['maxWidth'] = resolveSpacing(props.maxWidth);
  if (props.maxHeight !== undefined) s['maxHeight'] = resolveSpacing(props.maxHeight);

  // Visual
  if (props.bg !== undefined) s['background'] = props.bg;
  if (props.color !== undefined) s['color'] = props.color;
  if (props.radius !== undefined) s['borderRadius'] = resolveSpacing(props.radius);
  if (props.shadow !== undefined) s['boxShadow'] = props.shadow;
  if (props.border !== undefined) s['border'] = props.border;

  // Flex child
  if (props.flex !== undefined) s['flex'] = props.flex;
  if (props.grow !== undefined) s['flexGrow'] = props.grow;
  if (props.shrink !== undefined) s['flexShrink'] = props.shrink;
  if (props.basis !== undefined) s['flexBasis'] = props.basis;
  if (props.alignSelf !== undefined) s['alignSelf'] = props.alignSelf;
  if (props.order !== undefined) s['order'] = props.order;

  return s as CSSProperties;
}

const OWN_PROP_KEYS: ReadonlySet<string> = new Set<string>([
  'as', 'className', 'style', 'xstyle', 'children', 'testId',
  'p', 'px', 'py', 'pt', 'pb', 'pl', 'pr',
  'm', 'mx', 'my', 'mt', 'mb', 'ml', 'mr',
  'display', 'position', 'overflow',
  'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
  'bg', 'color', 'radius', 'shadow', 'border',
  'flex', 'grow', 'shrink', 'basis', 'alignSelf', 'order',
]);

function omitOwnProps(props: Record<string, unknown>): Record<string, unknown> {
  const rest: Record<string, unknown> = {};
  for (const key of Object.keys(props)) {
    if (!OWN_PROP_KEYS.has(key)) {
      rest[key] = props[key];
    }
  }
  return rest;
}

/**
 * Generic polymorphic box component.
 * Converts layout/spacing shorthand props to inline styles.
 */
function BoxInner<E extends ElementType = 'div'>(
  props: BoxProps<E>,
  ref: Ref<Element>,
) {
  const {
    as: Component = 'div',
    className,
    style,
    xstyle,
    children,
    testId,
  } = props;

  const computedStyles = buildStyles(props);
  const resolvedStyle: CSSProperties = {
    ...computedStyles,
    ...(xstyle as CSSProperties | undefined),
    ...style,
  };

  const rest = omitOwnProps(props as unknown as Record<string, unknown>);

  return (
    <Component
      ref={ref}
      className={className}
      style={Object.keys(resolvedStyle).length > 0 ? resolvedStyle : undefined}
      data-testid={testId}
      {...rest}
    >
      {children}
    </Component>
  );
}

export const Box = forwardRef(BoxInner) as <E extends ElementType = 'div'>(
  props: BoxProps<E> & { ref?: Ref<Element> },
) => React.JSX.Element;

export type { BoxProps, BoxOwnProps };
