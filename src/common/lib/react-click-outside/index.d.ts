
declare module "react-click-outside" {
  import * as React from 'react'

  type ClickOutSideProps = {
    onClickOutside: () => void;
    children: React.ReactNode;
  }

  class ClickOutside extends React.Component<ClickOutSideProps> {}

  export default ClickOutside
}
