// legacy withRouter

import {
  useLocation,
  useNavigate,
  useParams,
} from '@modern-js/runtime-utils/router';
import type React from 'react';

export interface WithRouterProps<T extends Record<string, string>> {
  location: ReturnType<typeof useLocation>;
  params: T;
  navigate: ReturnType<typeof useNavigate>;
}

export const withRouter = <
  T extends Record<string, string>,
  Props extends WithRouterProps<T>,
>(
  Component: React.ComponentType<Props>,
) => {
  return (props: Omit<Props, keyof WithRouterProps<T>>) => {
    const location = useLocation();
    const params = useParams<T>();
    const navigate = useNavigate();

    return (
      <Component
        {...(props as Props)}
        location={location}
        params={params}
        navigate={navigate}
      />
    );
  };
};
