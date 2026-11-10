import { TemplateList } from "workflows-lib-2";

export default function TemplateRoute() {

  const workflowTemplates = [
  {
    name: "normalisation",
    maintainer: "imaging-i14-group",
    title: "Normalisation",
    description: "Normalises data using min-max scaling."
  },
  {
    name: "calibrate",
    maintainer: "imaging-i14-group",
    title: "Calibrate Data",
    description: "Applies calibration to data using provided calirbation coeffiecients."
  },
  {
    name: "align",
    maintainer: "imaging-i14-group",
    title: "Align Data",
    description: `A utility which takes in a file path, a mask, aligns data according to vertical mass or phase 
      correlation between images, and does some more stuff that should overflow the text box and lead to an elipse`
  },
]
    
    return (
        <p>Template route page</p>
    );
}