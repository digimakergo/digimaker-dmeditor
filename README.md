
# digimaker-dmeditor

DMEditor on digimaker-ui, with below plugin

- Image editor, where editor can edit and save image to replace or create new.


## Configurte image editor
```javascript
 plugins: {
    imageHandlers: [
      (props) => (
        <EditImage
          {...props}
          config={{
            imageFolder: 10, //image folder's id
          }}
        />
      ),
    ],
  },

  ```