import { mapInputVectorToDirectional } from './enchantedLibraryInput'

describe('mapInputVectorToDirectional', () => {
  it('maps dx/dy to directional flags', () => {
    expect(mapInputVectorToDirectional({ dx: -1, dy: 0, cast: false })).toEqual({
      left: true,
      right: false,
      up: false,
      down: false,
      cast: false,
    })
    expect(mapInputVectorToDirectional({ dx: 0, dy: 1, cast: true })).toEqual({
      left: false,
      right: false,
      up: false,
      down: true,
      cast: true,
    })
  })

  it('maps diagonal input to multiple directions', () => {
    expect(mapInputVectorToDirectional({ dx: 1, dy: -1, cast: false })).toEqual({
      left: false,
      right: true,
      up: true,
      down: false,
      cast: false,
    })
  })
})
