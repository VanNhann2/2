module.exports = {
    "parser": "babel-eslint",
    "parserOptions": {
      "ecmaVersion": 6,
      "sourceType": "module",
      "ecmaFeatures": {
        "experimentalObjectRestSpread": true,
        "jsx": true
      }
    },
    "env": {
      "es6": true,
      "amd": true,
      "jquery": true,
      "browser": true,
      "node": true
    },
    "globals": {
      "ion": true,
      "trans": true,
      "axios": true,
      "PropTypes": true,
      "Echo": true
    },
    "plugins": [
      "prettier"
    ],
    "extends": ["eslint:recommended", "prettier"],
    "rules": {
      "prettier/prettier": "error",
      "no-console": 1,
      "eqeqeq": 2,
      "quotes": [2, "single"],
      "space-unary-ops": 0,
      "spaced-comment": 0,
      "strict": 2,
      "template-curly-spacing": 0,
      "use-isnan": 2,
      "valid-jsdoc": 0,
      "valid-typeof": 2,
      "vars-on-top": 0,
      "arrow-parens": 1
    }
  }
  
