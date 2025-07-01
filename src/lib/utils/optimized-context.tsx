import * as React from 'react';

/**
 * Create an optimized context that prevents unnecessary re-renders
 * by splitting state and dispatch into separate contexts
 */
export function createOptimizedContext<State, Action>(
  name: string,
  reducer: (state: State, action: Action) => State,
  initialState: State
) {
  // Create two separate contexts
  const StateContext = React.createContext<State | undefined>(undefined);
  const DispatchContext = React.createContext<React.Dispatch<Action> | undefined>(undefined);

  // Set display names for debugging
  StateContext.displayName = `${name}StateContext`;
  DispatchContext.displayName = `${name}DispatchContext`;

  // Provider component
  function Provider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = React.useReducer(reducer, initialState);

    // Memoize dispatch to prevent re-renders
    const memoizedDispatch = React.useMemo(() => dispatch, []);

    return (
      <StateContext.Provider value={state}>
        <DispatchContext.Provider value={memoizedDispatch}>
          {children}
        </DispatchContext.Provider>
      </StateContext.Provider>
    );
  }

  // Hook to use state
  function useState() {
    const context = React.useContext(StateContext);
    if (context === undefined) {
      throw new Error(`use${name}State must be used within ${name}Provider`);
    }
    return context;
  }

  // Hook to use dispatch
  function useDispatch() {
    const context = React.useContext(DispatchContext);
    if (context === undefined) {
      throw new Error(`use${name}Dispatch must be used within ${name}Provider`);
    }
    return context;
  }

  // Hook to use both state and dispatch
  function use() {
    return [useState(), useDispatch()] as const;
  }

  // Selector hook for fine-grained subscriptions
  function useSelector<Selected>(
    selector: (state: State) => Selected,
    equalityFn?: (a: Selected, b: Selected) => boolean
  ): Selected {
    const state = useState();
    const selectedRef = React.useRef<Selected>();
    const selectorRef = React.useRef(selector);

    // Update selector ref
    React.useEffect(() => {
      selectorRef.current = selector;
    });

    const selected = selectorRef.current(state);
    
    // Default equality check
    const isEqual = equalityFn || Object.is;

    // Only update if value has changed
    if (selectedRef.current === undefined || !isEqual(selectedRef.current, selected)) {
      selectedRef.current = selected;
    }

    return selectedRef.current;
  }

  return {
    Provider,
    useState,
    useDispatch,
    use,
    useSelector,
  };
}

/**
 * Example usage:
 * 
 * type State = { count: number; name: string };
 * type Action = 
 *   | { type: 'increment' }
 *   | { type: 'decrement' }
 *   | { type: 'setName'; payload: string };
 * 
 * const reducer = (state: State, action: Action): State => {
 *   switch (action.type) {
 *     case 'increment':
 *       return { ...state, count: state.count + 1 };
 *     case 'decrement':
 *       return { ...state, count: state.count - 1 };
 *     case 'setName':
 *       return { ...state, name: action.payload };
 *     default:
 *       return state;
 *   }
 * };
 * 
 * const Counter = createOptimizedContext('Counter', reducer, { count: 0, name: '' });
 * 
 * // In components:
 * function CountDisplay() {
 *   const count = Counter.useSelector(state => state.count);
 *   return <div>Count: {count}</div>;
 * }
 * 
 * function CountControls() {
 *   const dispatch = Counter.useDispatch();
 *   return (
 *     <button onClick={() => dispatch({ type: 'increment' })}>
 *       Increment
 *     </button>
 *   );
 * }
 */